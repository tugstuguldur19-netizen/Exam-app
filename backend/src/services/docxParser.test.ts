import { describe, it, expect } from "vitest";
import { parseExamText } from "./docxParser";

describe("parseExamText — English layout", () => {
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
    expect(short.type).toBe("SHORT_ANSWER");
    expect(short.correctText).toBe("Plants convert light into chemical energy.");
  });

  it("parses a trailing answer-key section instead of inline answers", () => {
    const text = `
      1. What is the capital of France?
      A) London
      B) Paris

      5. Explain photosynthesis in one sentence.

      Answers
      1. B
      5. Plants convert light into chemical energy.
    `;
    const { questions, warnings } = parseExamText(text);
    expect(warnings).toEqual([]);
    expect(questions[0].choices.find((c) => c.label === "B")?.isCorrect).toBe(true);
    expect(questions[1].correctText).toBe("Plants convert light into chemical energy.");
  });

  it("renumbers questions sequentially by position, not the printed number", () => {
    const { questions } = parseExamText("1. First?\nAnswer: yes\n\n5. Second?\nAnswer: no");
    expect(questions.map((q) => q.order)).toEqual([1, 2]);
  });

  it("keeps a multiple-choice question but flags it ungraded when no answer is given", () => {
    const { questions, warnings } = parseExamText("1. Unanswerable?\nA) One\nB) Two");
    expect(questions[0].hasKnownAnswer).toBe(false);
    expect(questions[0].choices.every((c) => !c.isCorrect)).toBe(true);
    expect(warnings).toEqual(["Асуулт 1: хариулт олдсонгүй — үнэлэгдэхгүй."]);
  });

  it("warns when an answer is given but matches no option", () => {
    const { questions, warnings } = parseExamText("1. Pick.\nA) One\nB) Two\nAnswer: D");
    expect(questions[0].hasKnownAnswer).toBe(false);
    expect(warnings).toEqual(["Асуулт 1: «D» хариулт аль ч хувилбартай таарсангүй — үнэлэгдэхгүй."]);
  });

  it("returns no questions and a warning for prose with no numbered questions", () => {
    const { questions, warnings } = parseExamText("This is just a paragraph of prose.");
    expect(questions).toEqual([]);
    expect(warnings).toEqual(["Дугаарласан асуулт олдсонгүй."]);
  });

  it("accepts lowercase option letters and uppercases the label", () => {
    const { questions } = parseExamText("1. Pick one.\na) Alpha\nb) Beta\nAnswer: b");
    expect(questions[0].choices.map((c) => c.label)).toEqual(["A", "B"]);
    expect(questions[0].choices.find((c) => c.label === "B")?.isCorrect).toBe(true);
  });

  it("joins a wrapped multi-line prompt before options start", () => {
    const { questions } = parseExamText("1. This prompt\nwraps across lines.\nA) First\nB) Second\nAnswer: A");
    expect(questions[0].prompt).toBe("This prompt wraps across lines.");
  });

  it("handles CRLF line endings the same as LF", () => {
    const { questions, warnings } = parseExamText(["1. 2 + 2?", "A) 3", "B) 4", "Answer: B"].join("\r\n"));
    expect(warnings).toEqual([]);
    expect(questions[0].choices.find((c) => c.label === "B")?.isCorrect).toBe(true);
  });

  it("keeps the last entry when the answer key repeats a question number", () => {
    const { questions } = parseExamText("1. Pick.\nA) First\nB) Second\n\nAnswers\n1. A\n1. B");
    expect(questions[0].choices.find((c) => c.isCorrect)?.label).toBe("B");
  });

  it("uses the line before the first question as the title", () => {
    expect(parseExamText("Algebra Quiz\n1. 2+2?\nAnswer: 4").title).toBe("Algebra Quiz");
    expect(parseExamText("1. 2+2?\nAnswer: 4").title).toBeNull();
  });

  it("doesn't mistake a decimal at the start of a wrapped line for a new question", () => {
    const { questions } = parseExamText("1. Compute:\n2.5 + 3 = ?\nA) 5.5\nB) 6\nAnswer: A");
    expect(questions).toHaveLength(1);
    expect(questions[0].prompt).toBe("Compute: 2.5 + 3 = ?");
  });
});

describe("parseExamText — Mongolian layout", () => {
  it("parses Cyrillic option letters, «Хариулт:» and «Тайлбар:»", () => {
    const text = `
      Газарзүйн сорил
      1. Монгол Улсын нийслэл аль нь вэ?
      А) Дархан
      Б) Улаанбаатар
      В) Эрдэнэт
      Г) Чойбалсан
      Хариулт: Б
      Тайлбар: Улаанбаатар 1924 оноос хойш нийслэл.
    `;
    const { title, questions, warnings } = parseExamText(text);
    expect(warnings).toEqual([]);
    expect(title).toBe("Газарзүйн сорил");
    expect(questions[0].choices.map((c) => c.label)).toEqual(["А", "Б", "В", "Г"]);
    expect(questions[0].choices.find((c) => c.isCorrect)?.text).toBe("Улаанбаатар");
    expect(questions[0].explanation).toBe("Улаанбаатар 1924 оноос хойш нийслэл.");
  });

  it("parses «Зөв хариулт:» and short answers", () => {
    const { questions, warnings } = parseExamText("1. 5 + 7 = ?\nЗөв хариулт: 12");
    expect(warnings).toEqual([]);
    expect(questions[0].type).toBe("SHORT_ANSWER");
    expect(questions[0].correctText).toBe("12");
  });

  it("matches a Latin answer letter to the Cyrillic option that looks the same", () => {
    // Typed "B" on a Latin keyboard for options А Б В Г means В (3rd), which
    // is what the teacher sees — not Б (2nd).
    const { questions } = parseExamText("1. Сонго.\nА) нэг\nБ) хоёр\nВ) гурав\nГ) дөрөв\nХариулт: B");
    expect(questions[0].choices.find((c) => c.isCorrect)?.label).toBe("В");
  });

  it("matches a Cyrillic answer letter to the Latin option that looks the same", () => {
    const { questions } = parseExamText("1. Pick.\nA) one\nB) two\nC) three\nХариулт: В");
    expect(questions[0].choices.find((c) => c.isCorrect)?.label).toBe("B");
  });

  it("accepts an answer written as the option's text instead of its letter", () => {
    const { questions } = parseExamText("1. Нийслэл?\nА) Дархан\nБ) Улаанбаатар\nХариулт: улаанбаатар");
    expect(questions[0].choices.find((c) => c.isCorrect)?.label).toBe("Б");
  });

  it("parses a compact answer key under a «Хариулт» header", () => {
    const text = `
      1. Эхнийх?
      А) а
      Б) б
      2. Хоёрдахь?
      А) а
      Б) б
      3. Гуравдахь?
      А) а
      Б) б

      Хариулт
      1-А 2-Б, 3-А
    `;
    const { questions, warnings } = parseExamText(text);
    expect(warnings).toEqual([]);
    expect(questions.map((q) => q.choices.find((c) => c.isCorrect)?.label)).toEqual(["А", "Б", "А"]);
  });

  it("doesn't mistake a name initial like «Б.Батболд» for an option", () => {
    const { questions } = parseExamText("1. Хэн бичсэн бэ:\nБ.Батболдын шүлгийг\nА) Тийм\nБ) Үгүй\nХариулт: А");
    expect(questions[0].prompt).toBe("Хэн бичсэн бэ: Б.Батболдын шүлгийг");
    expect(questions[0].choices).toHaveLength(2);
  });

  it("supports a fifth option (Д / E), as in ЭЕШ-style tests", () => {
    const { questions } = parseExamText("1. Сонго.\nА) 1\nБ) 2\nВ) 3\nГ) 4\nД) 5\nХариулт: Д");
    expect(questions[0].choices).toHaveLength(5);
    expect(questions[0].choices.find((c) => c.isCorrect)?.text).toBe("5");
  });
});
