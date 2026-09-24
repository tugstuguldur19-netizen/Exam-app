import { describe, it, expect, afterEach, vi } from "vitest";
import { normalizeAnswer, shortAnswerMatches } from "./grading";

describe("normalizeAnswer", () => {
  it("lowercases, trims, strips punctuation, and collapses whitespace", () => {
    expect(normalizeAnswer("  A Symbol, That Represents!!  ")).toBe("a symbol that represents");
  });

  it("collapses internal runs of whitespace to a single space", () => {
    expect(normalizeAnswer("too   many\tspaces")).toBe("too many spaces");
  });

  it("keeps accented/unicode letters intact", () => {
    expect(normalizeAnswer("Café Résumé")).toBe("café résumé");
  });

  it("lowercases Mongolian Cyrillic, including Ө and Ү", () => {
    expect(normalizeAnswer("  ӨВӨЛ, Үүр! ")).toBe("өвөл үүр");
  });

  it("keeps digits", () => {
    expect(normalizeAnswer("Answer: 42!")).toBe("answer 42");
  });
});

describe("shortAnswerMatches", () => {
  it("matches identical text", () => {
    expect(shortAnswerMatches("Paris", "Paris")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(shortAnswerMatches("paris", "PARIS")).toBe(true);
  });

  it("ignores punctuation and extra whitespace", () => {
    expect(shortAnswerMatches("  Paris!! ", "paris")).toBe(true);
    expect(shortAnswerMatches("a symbol that represents", "A symbol, that represents.")).toBe(true);
  });

  it("rejects genuinely different answers", () => {
    expect(shortAnswerMatches("London", "Paris")).toBe(false);
  });

  it("rejects a substring that isn't the full answer", () => {
    expect(shortAnswerMatches("Paris", "Paris is the capital of France")).toBe(false);
  });

  it("treats an empty submission as not matching a non-empty answer", () => {
    expect(shortAnswerMatches("", "Paris")).toBe(false);
  });
});

describe("shortAnswerMatchesSemantically", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("returns null (no grading call attempted) when ANTHROPIC_API_KEY is unset", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const { shortAnswerMatchesSemantically } = await import("./grading");

    const result = await shortAnswerMatchesSemantically(
      "What is a variable?",
      "a name that stands in for a value that can change",
      "a symbol that represents an unknown or changeable value"
    );

    expect(result).toBeNull();
  });

  it("returns null for an empty submission even when a key is configured", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test-not-a-real-key");
    const { shortAnswerMatchesSemantically } = await import("./grading");

    const result = await shortAnswerMatchesSemantically("Q", "   ", "some correct answer");

    expect(result).toBeNull();
  });
});
