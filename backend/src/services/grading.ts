import Anthropic from "@anthropic-ai/sdk";
import { env } from "../lib/env";

export function normalizeAnswer(text: string): string {
  return text
    .toLocaleLowerCase("mn")
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ");
}

export function shortAnswerMatches(submitted: string, correct: string): boolean {
  return normalizeAnswer(submitted) === normalizeAnswer(correct);
}

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!env.anthropicApiKey) return null;
  if (!client) client = new Anthropic({ apiKey: env.anthropicApiKey });
  return client;
}

// Second-pass grading for short answers that fail the literal match — e.g.
// "photosynthesis turns light into chemical energy" vs. the seeded answer
// "process by which plants convert light energy into chemical energy".
// Only called when ANTHROPIC_API_KEY is set; on any failure (no key, API
// error, malformed response) we keep the exact-match verdict rather than
// let one grading call fail the whole submission.
export async function shortAnswerMatchesSemantically(
  prompt: string,
  submitted: string,
  correct: string
): Promise<boolean | null> {
  const anthropic = getClient();
  if (!anthropic || !submitted.trim()) return null;

  try {
    const message = await anthropic.messages.create({
      model: "claude-opus-5",
      max_tokens: 2048,
      system:
        "You grade a single short-answer exam response. Judge whether the student's " +
        'answer is substantively correct compared to the reference answer — reward the ' +
        "same meaning in different words, don't require exact phrasing. The exam may be " +
        "in Mongolian or English. " +
        'Respond with ONLY "true" or "false", nothing else.',
      messages: [
        {
          role: "user",
          content: `Question: ${prompt}\nReference answer: ${correct}\nStudent answer: ${submitted}`,
        },
      ],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return null;
    const verdict = textBlock.text.trim().toLocaleLowerCase("mn");
    if (verdict.startsWith("true")) return true;
    if (verdict.startsWith("false")) return false;
    return null;
  } catch {
    return null;
  }
}
