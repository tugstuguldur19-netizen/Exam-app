// Heuristic parser for exam .docx files converted to plain text (via mammoth).
// Handles both Mongolian and English layouts:
//
//   1. Монгол Улсын нийслэл аль нь вэ?        1. What is the capital of France?
//   А) Дархан                                 A) London
//   Б) Улаанбаатар                            B) Paris
//   В) Эрдэнэт                                C) Berlin
//   Хариулт: Б                                Answer: B
//   Тайлбар: ...                              Explanation: ...
//
// ...short-answer questions (no options, just an answer line), and an answer
// key at the end instead of inline answers — one per line ("1. B") or
// compact ("1-B 2-C 3-A").
//
// It stays conservative: anything it can't confidently grade is reported in
// `warnings` and saved ungraded rather than guessed at.

export type ParsedChoice = { label: string; text: string; isCorrect: boolean };
export type ParsedQuestion = {
  order: number;
  type: "MULTIPLE_CHOICE" | "SHORT_ANSWER";
  prompt: string;
  choices: ParsedChoice[];
  correctText: string | null;
  explanation: string | null;
  hasKnownAnswer: boolean;
};

export type ParseResult = {
  title: string | null;
  questions: ParsedQuestion[];
  warnings: string[];
};

const OPTION_LETTERS = "A-Ea-eА-Еа-е";
// "1) x" / "1. x" but not "1.x" or "2.5 + 3" — and likewise "Б. x" but not
// the initial in a name like "Б.Батболд" at the start of a wrapped line.
const SEP = "(?:\\)\\s*|\\.\\s+)";
const QUESTION_START = new RegExp(`^\\s*(\\d{1,3})\\s*${SEP}(.*\\S)\\s*$`, "u");
const OPTION_LINE = new RegExp(`^\\s*([${OPTION_LETTERS}])\\s*${SEP}(.*\\S)\\s*$`, "u");
const INLINE_ANSWER = /^\s*(зөв хариулт|хариулт|хариу|correct answer|answer|ans)\s*[:\-–]\s*(.*\S)\s*$/iu;
const EXPLANATION = /^\s*(тайлбар|explanation)\s*[:\-–]\s*(.*\S)\s*$/iu;
const ANSWER_KEY_HEADER =
  /^\s*(answer key|answers|хариултын түлхүүр|зөв хариултууд|зөв хариулт|хариултууд|хариулт)\s*:?\s*$/iu;
const ANSWER_KEY_LINE = /^\s*(\d{1,3})\s*[.):\-–]\s*(.*\S)\s*$/u;
const COMPACT_PAIR = new RegExp(`(\\d{1,3})\\s*[.):\\-–]?\\s*([${OPTION_LETTERS}])(?![\\p{L}])`, "gu");

// Latin and Cyrillic letters that look identical. A teacher typing the answer
// "B" on a Latin keyboard for options labelled А Б В Г means the option that
// *looks* like B — Cyrillic В — not the 2nd option.
const LATIN_TO_CYRILLIC: Record<string, string> = { A: "А", B: "В", E: "Е" };
const CYRILLIC_TO_LATIN: Record<string, string> = { А: "A", В: "B", Е: "E" };

function upper(s: string) {
  return s.toLocaleUpperCase("mn");
}

function normalize(s: string) {
  return s.toLocaleLowerCase("mn").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function matchChoice(options: ParsedChoice[], key: string): ParsedChoice | undefined {
  const trimmed = key.trim();
  const letterMatch = trimmed.match(new RegExp(`^([${OPTION_LETTERS}])(?:[.)\\s]|$)`, "u"));
  if (letterMatch) {
    const letter = upper(letterMatch[1]);
    const exact = options.find((o) => o.label === letter);
    if (exact) return exact;
    const lookalike = LATIN_TO_CYRILLIC[letter] ?? CYRILLIC_TO_LATIN[letter];
    if (lookalike) {
      const viaLookalike = options.find((o) => o.label === lookalike);
      if (viaLookalike) return viaLookalike;
    }
  }
  // The key may spell out the option instead of naming its letter.
  const byText = normalize(trimmed);
  return byText ? options.find((o) => normalize(o.text) === byText) : undefined;
}

function parseAnswerKey(lines: string[]): Map<number, string> {
  const key = new Map<number, string>();
  for (const line of lines) {
    const pairs = [...line.matchAll(COMPACT_PAIR)];
    const pairsCoverLine = pairs.length >= 2 && line.replace(COMPACT_PAIR, "").replace(/[\s,;]/g, "") === "";
    if (pairsCoverLine) {
      for (const p of pairs) key.set(Number(p[1]), p[2]);
      continue;
    }
    const m = line.match(ANSWER_KEY_LINE);
    if (m) key.set(Number(m[1]), m[2].trim());
  }
  return key;
}

export function parseExamText(rawText: string): ParseResult {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const warnings: string[] = [];

  let bodyLines = lines;
  let answerKey = new Map<number, string>();
  const keyHeaderIdx = lines.findIndex((l) => ANSWER_KEY_HEADER.test(l));
  if (keyHeaderIdx !== -1) {
    bodyLines = lines.slice(0, keyHeaderIdx);
    answerKey = parseAnswerKey(lines.slice(keyHeaderIdx + 1));
  }

  type RawQ = {
    num: number;
    promptLines: string[];
    options: ParsedChoice[];
    inlineAnswer: string | null;
    explanation: string | null;
  };
  const raw: RawQ[] = [];
  const preamble: string[] = [];
  let current: RawQ | null = null;

  for (const line of bodyLines) {
    const optMatch = line.match(OPTION_LINE);
    const ansMatch = line.match(INLINE_ANSWER);
    const expMatch = line.match(EXPLANATION);
    const qMatch = !optMatch && !ansMatch && !expMatch ? line.match(QUESTION_START) : null;

    if (qMatch) {
      if (current) raw.push(current);
      current = { num: Number(qMatch[1]), promptLines: [qMatch[2]], options: [], inlineAnswer: null, explanation: null };
    } else if (!current) {
      preamble.push(line);
    } else if (optMatch) {
      current.options.push({ label: upper(optMatch[1]), text: optMatch[2], isCorrect: false });
    } else if (ansMatch) {
      current.inlineAnswer = ansMatch[2].trim();
    } else if (expMatch) {
      current.explanation = expMatch[2].trim();
    } else if (current.options.length === 0 && current.inlineAnswer === null) {
      // A wrapped prompt line, as long as options haven't started yet.
      current.promptLines.push(line);
    }
  }
  if (current) raw.push(current);

  const title = preamble.length > 0 ? preamble[0].slice(0, 120) : null;

  if (raw.length === 0) {
    return { title, questions: [], warnings: ["Дугаарласан асуулт олдсонгүй."] };
  }

  const questions: ParsedQuestion[] = raw.map((q, idx) => {
    const prompt = q.promptLines.join(" ").trim();
    const keyAnswer = q.inlineAnswer ?? answerKey.get(q.num) ?? null;

    if (q.options.length >= 2) {
      const match = keyAnswer ? matchChoice(q.options, keyAnswer) : undefined;
      if (match) {
        match.isCorrect = true;
      } else {
        warnings.push(
          keyAnswer
            ? `Асуулт ${q.num}: «${keyAnswer}» хариулт аль ч хувилбартай таарсангүй — үнэлэгдэхгүй.`
            : `Асуулт ${q.num}: хариулт олдсонгүй — үнэлэгдэхгүй.`
        );
      }
      return {
        order: idx + 1,
        type: "MULTIPLE_CHOICE",
        prompt,
        choices: q.options,
        correctText: null,
        explanation: q.explanation,
        hasKnownAnswer: Boolean(match),
      };
    }

    if (!keyAnswer) warnings.push(`Асуулт ${q.num}: хариулт олдсонгүй — үнэлэгдэхгүй.`);
    return {
      order: idx + 1,
      type: "SHORT_ANSWER",
      prompt,
      choices: [],
      correctText: keyAnswer,
      explanation: q.explanation,
      hasKnownAnswer: Boolean(keyAnswer),
    };
  });

  return { title, questions, warnings };
}
