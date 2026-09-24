import Anthropic from "@anthropic-ai/sdk";
import { env } from "../lib/env";
import { ParsedQuestion } from "./docxParser";

const MODEL = "claude-opus-5";

// Fallback for exam documents the regex heuristics can't confidently parse
// (inconsistent numbering, prose-style questions, answers embedded in
// running text, etc). Only runs when ANTHROPIC_API_KEY is configured.
export async function extractQuestionsWithAI(
  rawText: string
): Promise<{ questions: ParsedQuestion[]; warnings: string[] }> {
  if (!env.anthropicApiKey) return { questions: [], warnings: [] };

  const client = new Anthropic({ apiKey: env.anthropicApiKey });

  let text: string;
  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system:
        "You extract exam questions from raw document text into strict JSON. The document " +
        "may be in Mongolian (Cyrillic) or English; keep every question, option and " +
        "explanation in its original language and wording. Only include questions that " +
        "appear in the text — never invent questions or answers. If the correct answer " +
        "for a question isn't stated anywhere in the document, set hasKnownAnswer to false.",
      messages: [
        {
          role: "user",
          content:
            `Extract every exam question from the document below into a JSON array matching this TypeScript type:\n\n` +
            `type Question = {\n` +
            `  order: number; // 1, 2, 3... in document order\n` +
            `  type: "MULTIPLE_CHOICE" | "SHORT_ANSWER";\n` +
            `  prompt: string;\n` +
            `  choices: { label: string; text: string; isCorrect: boolean }[]; // label as printed (A, Б, ...); empty for SHORT_ANSWER\n` +
            `  correctText: string | null; // SHORT_ANSWER only\n` +
            `  explanation: string | null; // only if the document gives one\n` +
            `  hasKnownAnswer: boolean;\n` +
            `};\n\n` +
            `Respond with ONLY the JSON array, no prose, no markdown fences.\n\n` +
            `DOCUMENT:\n${rawText.slice(0, 40000)}`,
        },
      ],
    });
    const block = message.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") throw new Error("no text block");
    text = block.text;
  } catch (err) {
    console.error("AI extraction failed:", err instanceof Error ? err.message : err);
    return { questions: [], warnings: ["AI-аар асуулт таних боломжгүй байлаа."] };
  }

  try {
    const parsed = JSON.parse(text.slice(text.indexOf("["), text.lastIndexOf("]") + 1)) as ParsedQuestion[];
    const questions = parsed
      .filter((q) => q && typeof q.prompt === "string" && q.prompt.trim())
      .map((q, i) => {
        const choices = Array.isArray(q.choices)
          ? q.choices.map((c) => ({ label: String(c.label), text: String(c.text), isCorrect: Boolean(c.isCorrect) }))
          : [];
        const type = choices.length >= 2 ? ("MULTIPLE_CHOICE" as const) : ("SHORT_ANSWER" as const);
        const correctText = type === "SHORT_ANSWER" && q.correctText ? String(q.correctText) : null;
        const hasKnownAnswer = type === "MULTIPLE_CHOICE" ? choices.some((c) => c.isCorrect) : Boolean(correctText);
        return {
          order: i + 1,
          type,
          prompt: q.prompt.trim(),
          choices: type === "MULTIPLE_CHOICE" ? choices : [],
          correctText,
          explanation: q.explanation ? String(q.explanation) : null,
          hasKnownAnswer,
        };
      });
    const warnings = questions
      .filter((q) => !q.hasKnownAnswer)
      .map((q) => `Асуулт ${q.order}: хариулт олдсонгүй — үнэлэгдэхгүй.`);
    return { questions, warnings };
  } catch {
    return { questions: [], warnings: ["AI-аар асуулт таних үед алдаа гарлаа."] };
  }
}
