// Heuristic parser for exam .docx files converted to plain text (via mammoth).
// Supports the common exam layout:
//
//   1. What is the capital of France?
//   A) London
//   B) Paris
//   C) Berlin
//   D) Madrid
//   Answer: B
//
//   5. Explain photosynthesis in one sentence.
//   Answer: Plants convert light into chemical energy.
//
// ...as well as a trailing answer key section instead of inline answers:
//
//   Answers
//   1. B
//   2. A
//   5. Plants convert light into chemical energy.
//
// It intentionally stays conservative: anything it can't confidently parse
// is reported in `warnings` rather than guessed at.

export type ParsedChoice = { label: string; text: string; isCorrect: boolean };
export type ParsedQuestion = {
  order: number;
  type: "MULTIPLE_CHOICE" | "SHORT_ANSWER";
  prompt: string;
  choices: ParsedChoice[];
  correctText: string | null;
  hasKnownAnswer: boolean;
};

export type ParseResult = {
  questions: ParsedQuestion[];
  warnings: string[];
};

const QUESTION_START = /^\s*(\d{1,3})[.)]\s+(.*\S)\s*$/;
const OPTION_LINE = /^\s*([A-Da-d])[.)]\s+(.*\S)\s*$/;
const INLINE_ANSWER = /^\s*(answer|ans|correct answer)\s*[:\-]\s*(.*\S)\s*$/i;
const ANSWER_KEY_HEADER = /^\s*(answer key|answers)\s*:?\s*$/i;
const ANSWER_KEY_LINE = /^\s*(\d{1,3})\s*[.):\-]\s*(.*\S)\s*$/;

export function parseExamText(rawText: string): ParseResult {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const warnings: string[] = [];

  // Split off a trailing answer-key section, if present.
  let bodyLines = lines;
  const answerKey = new Map<number, string>();
  const keyHeaderIdx = lines.findIndex((l) => ANSWER_KEY_HEADER.test(l));
  if (keyHeaderIdx !== -1) {
    bodyLines = lines.slice(0, keyHeaderIdx);
    for (const line of lines.slice(keyHeaderIdx + 1)) {
      const m = line.match(ANSWER_KEY_LINE);
      if (m) answerKey.set(Number(m[1]), m[2].trim());
    }
  }

  type RawQ = { num: number; promptLines: string[]; options: ParsedChoice[]; inlineAnswer: string | null };
  const raw: RawQ[] = [];
  let current: RawQ | null = null;

  for (const line of bodyLines) {
    const qMatch = line.match(QUESTION_START);
    const optMatch = line.match(OPTION_LINE);
    const ansMatch = line.match(INLINE_ANSWER);

    if (qMatch && !optMatch) {
      if (current) raw.push(current);
      current = { num: Number(qMatch[1]), promptLines: [qMatch[2]], options: [], inlineAnswer: null };
    } else if (optMatch && current) {
      current.options.push({ label: optMatch[1].toUpperCase(), text: optMatch[2], isCorrect: false });
    } else if (ansMatch && current) {
      current.inlineAnswer = ansMatch[2].trim();
    } else if (current) {
      // Continuation of the question prompt (wrapped line) as long as we
      // haven't started reading options yet.
      if (current.options.length === 0) {
        current.promptLines.push(line);
      }
    }
  }
  if (current) raw.push(current);

  if (raw.length === 0) {
    return { questions: [], warnings: ["No numbered questions were detected in this document."] };
  }

  const questions: ParsedQuestion[] = raw.map((q, idx) => {
    const prompt = q.promptLines.join(" ").trim();
    const keyAnswer = q.inlineAnswer ?? answerKey.get(q.num) ?? null;

    if (q.options.length >= 2) {
      let matched = false;
      if (keyAnswer) {
        const letter = keyAnswer.trim().charAt(0).toUpperCase();
        const choice = q.options.find((o) => o.label === letter);
        if (choice) {
          choice.isCorrect = true;
          matched = true;
        }
      }
      if (!matched) {
        warnings.push(`Question ${q.num}: no answer key entry matched — saved ungraded.`);
      }
      return {
        order: idx + 1,
        type: "MULTIPLE_CHOICE",
        prompt,
        choices: q.options,
        correctText: null,
        hasKnownAnswer: matched,
      };
    }

    if (!keyAnswer) {
      warnings.push(`Question ${q.num}: no answer found — saved ungraded.`);
    }
    return {
      order: idx + 1,
      type: "SHORT_ANSWER",
      prompt,
      choices: [],
      correctText: keyAnswer,
      hasKnownAnswer: Boolean(keyAnswer),
    };
  });

  return { questions, warnings };
}
