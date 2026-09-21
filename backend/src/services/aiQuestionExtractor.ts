import Anthropic from "@anthropic-ai/sdk";
import { env } from "../lib/env";
import { ParsedQuestion } from "./docxParser";

// Fallback for exam documents the regex heuristics can't confidently parse
// (inconsistent numbering, prose-style questions, answers embedded in
// running text, etc). Only runs when ANTHROPIC_API_KEY is configured.
export async function extractQuestionsWithAI(
  rawText: string
): Promise<{ questions: ParsedQuestion[]; warnings: string[] }> {
  if (!env.anthropicApiKey) {
    return { questions: [], warnings: ["AI extraction skipped: ANTHROPIC_API_KEY not configured."] };
  }

  const client = new Anthropic({ apiKey: env.anthropicApiKey });

  const message = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 4096,
    system:
      "You extract exam questions from raw document text into strict JSON. " +
      "Only include questions you can find in the text — never invent content. " +
      "If you can't determine a correct answer for a question, set hasKnownAnswer to false " +
      "and correctText/choices[].isCorrect accordingly (all false / null).",
    messages: [
      {
        role: "user",
        content:
          `Extract every exam question from the document below into a JSON array matching this TypeScript type:\n\n` +
          `type Question = {\n` +
          `  order: number;\n` +
          `  type: "MULTIPLE_CHOICE" | "SHORT_ANSWER";\n` +
          `  prompt: string;\n` +
          `  choices: { label: string; text: string; isCorrect: boolean }[]; // empty for SHORT_ANSWER\n` +
          `  correctText: string | null; // only for SHORT_ANSWER\n` +
          `  hasKnownAnswer: boolean;\n` +
          `};\n\n` +
          `Respond with ONLY the JSON array, no prose, no markdown fences.\n\n` +
          `DOCUMENT:\n${rawText.slice(0, 20000)}`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return { questions: [], warnings: ["AI extraction returned no text content."] };
  }

  try {
    const jsonStart = textBlock.text.indexOf("[");
    const jsonEnd = textBlock.text.lastIndexOf("]");
    const parsed = JSON.parse(textBlock.text.slice(jsonStart, jsonEnd + 1)) as ParsedQuestion[];
    const warnings = parsed
      .filter((q) => !q.hasKnownAnswer)
      .map((q) => `Question ${q.order}: AI extraction found no confident answer — saved ungraded.`);
    return { questions: parsed, warnings };
  } catch {
    return { questions: [], warnings: ["AI extraction returned malformed JSON; falling back to no questions."] };
  }
}
