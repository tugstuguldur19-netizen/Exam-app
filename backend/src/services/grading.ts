export function normalizeAnswer(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ");
}

export function shortAnswerMatches(submitted: string, correct: string): boolean {
  return normalizeAnswer(submitted) === normalizeAnswer(correct);
}
