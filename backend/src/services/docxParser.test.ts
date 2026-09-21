import { describe, it, expect } from "vitest";
import { parseExamText } from "./docxParser";

describe("parseExamText", () => {
  it("parses inline-answer multiple-choice and short-answer questions", () => {
    const text = `
      1. What is the capital of France?
      A) London
      B) Paris
      C) Berlin
      D) Madrid
      Answer: B

      2. Explain photosynthesis in one sentence.
      Answer: Plants convert light into chemical energy.
    `;

    const { questions, warnings } = parseExamText(text);

    expect(warnings).toEqual([]);
    expect(questions).toHaveLength(2);

    const [mcq, short] = questions;
    expect(mcq.type).toBe("MULTIPLE_CHOICE");
    expect(mcq.prompt).toBe("What is the capital of France?");
    expect(mcq.choices).toHaveLength(4);
    expect(mcq.choices.find((c) => c.label === "B")?.isCorrect).toBe(true);
    expect(mcq.choices.filter((c) => c.isCorrect)).toHaveLength(1);
    expect(mcq.hasKnownAnswer).toBe(true);

    expect(short.type).toBe("SHORT_ANSWER");
    expect(short.prompt).toBe("Explain photosynthesis in one sentence.");
    expect(short.correctText).toBe("Plants convert light into chemical energy.");
    expect(short.hasKnownAnswer).toBe(true);
  });

  it("parses a trailing answer-key section instead of inline answers", () => {
    const text = `
      1. What is the capital of France?
      A) London
      B) Paris
      C) Berlin
      D) Madrid

      5. Explain photosynthesis in one sentence.

      Answers
      1. B
      5. Plants convert light into chemical energy.
    `;

    const { questions, warnings } = parseExamText(text);

    expect(warnings).toEqual([]);
    expect(questions).toHaveLength(2);
    expect(questions[0].choices.find((c) => c.label === "B")?.isCorrect).toBe(true);
    expect(questions[1].correctText).toBe("Plants convert light into chemical energy.");
  });

  it("renumbers questions sequentially by position, not by the original question number", () => {
    // The source numbering (1, 5) is just what was printed on the page —
    // callers key off array order (`order`), not the raw label.
    const text = `
      1. First question?
      Answer: yes

      5. Second question?
      Answer: no
    `;
    const { questions } = parseExamText(text);
    expect(questions.map((q) => q.order)).toEqual([1, 2]);
  });

  it("keeps a multiple-choice question but flags it ungraded when no answer key entry matches", () => {
    const text = `
      1. Unanswerable question?
      A) One
      B) Two
    `;
    const { questions, warnings } = parseExamText(text);

    expect(questions).toHaveLength(1);
    expect(questions[0].type).toBe("MULTIPLE_CHOICE");
    expect(questions[0].hasKnownAnswer).toBe(false);
    expect(questions[0].choices.every((c) => !c.isCorrect)).toBe(true);
    expect(warnings).toEqual(["Question 1: no answer key entry matched — saved ungraded."]);
  });

  it("keeps a short-answer question but flags it ungraded when no answer is found", () => {
    const text = `1. What is your favorite color?`;
    const { questions, warnings } = parseExamText(text);

    expect(questions).toHaveLength(1);
    expect(questions[0].type).toBe("SHORT_ANSWER");
    expect(questions[0].correctText).toBeNull();
    expect(questions[0].hasKnownAnswer).toBe(false);
    expect(warnings).toEqual(["Question 1: no answer found — saved ungraded."]);
  });

  it("returns no questions and a warning for text with no numbered questions", () => {
    const { questions, warnings } = parseExamText("This is just a paragraph of prose, not an exam.");
    expect(questions).toEqual([]);
    expect(warnings).toEqual(["No numbered questions were detected in this document."]);
  });

  it("returns no questions for empty input", () => {
    const { questions, warnings } = parseExamText("");
    expect(questions).toEqual([]);
    expect(warnings).toHaveLength(1);
  });

  it("accepts lowercase option letters and uppercases the label", () => {
    const text = `
      1. Pick one.
      a) Alpha
      b) Beta
      Answer: b
    `;
    const { questions } = parseExamText(text);
    expect(questions[0].choices.map((c) => c.label)).toEqual(["A", "B"]);
    expect(questions[0].choices.find((c) => c.label === "B")?.isCorrect).toBe(true);
  });

  it("recognizes Ans: and Correct Answer: as inline-answer markers", () => {
    const text = `
      1. Question one?
      A) Right
      B) Wrong
      Ans: A

      2. Question two?
      A) Wrong
      B) Right
      Correct Answer: B
    `;
    const { questions } = parseExamText(text);
    expect(questions[0].choices.find((c) => c.label === "A")?.isCorrect).toBe(true);
    expect(questions[1].choices.find((c) => c.label === "B")?.isCorrect).toBe(true);
  });

  it("joins a wrapped multi-line prompt before options start", () => {
    const text = `
      1. This question prompt
      wraps across multiple lines
      before the options begin.
      A) First
      B) Second
      Answer: A
    `;
    const { questions } = parseExamText(text);
    expect(questions[0].prompt).toBe(
      "This question prompt wraps across multiple lines before the options begin."
    );
  });

  it("treats a question with only one option as short-answer (below the multiple-choice threshold)", () => {
    // Documents the actual threshold behavior in the parser (`>= 2` options)
    // rather than asserting what an ideal parser "should" do with malformed input.
    const text = `
      1. Odd one out?
      A) Only option
      Answer: A
    `;
    const { questions } = parseExamText(text);
    expect(questions[0].type).toBe("SHORT_ANSWER");
  });
});
