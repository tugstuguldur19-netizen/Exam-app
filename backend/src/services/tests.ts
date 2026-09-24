import { Prisma, TestMode, TestSession } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { HttpError, notFound } from "../lib/http";
import { shortAnswerMatches, shortAnswerMatchesSemantically } from "./grading";

export const MAX_QUESTIONS_PER_TEST = 200;

export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const questionWithChoices = { choices: { orderBy: { order: "asc" } } } satisfies Prisma.QuestionInclude;
type QuestionWithChoices = Prisma.QuestionGetPayload<{ include: typeof questionWithChoices }>;

async function loadQuestions(ids: string[]): Promise<QuestionWithChoices[]> {
  const rows = await prisma.question.findMany({ where: { id: { in: ids } }, include: questionWithChoices });
  const byId = new Map(rows.map((q) => [q.id, q]));
  // Keep the session's fixed order; skip anything deleted since.
  return ids.map((id) => byId.get(id)).filter((q): q is QuestionWithChoices => Boolean(q));
}

// Whether the question has an answer key we can grade against.
function isGradable(q: QuestionWithChoices) {
  return q.type === "MULTIPLE_CHOICE" ? q.choices.some((c) => c.isCorrect) : Boolean(q.correctText);
}

// Questions ids the user last answered wrong in this subject (latest answer
// per question wins, so fixing a mistake removes it from the set).
export async function mistakeQuestionIds(userId: string, subjectId: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ questionId: string }[]>`
    SELECT t."questionId" FROM (
      SELECT DISTINCT ON (a."questionId") a."questionId", a."isCorrect"
      FROM "Answer" a
      JOIN "TestSession" s ON s.id = a."sessionId"
      JOIN "Question" q ON q.id = a."questionId"
      JOIN "Lesson" l ON l.id = q."lessonId"
      WHERE s."userId" = ${userId} AND s.status = 'SUBMITTED' AND l."subjectId" = ${subjectId}
        AND a."isCorrect" IS NOT NULL
      ORDER BY a."questionId", s."submittedAt" DESC
    ) t
    WHERE t."isCorrect" = false`;
  return rows.map((r) => r.questionId);
}

export async function createSession(data: {
  userId: string;
  mode: TestMode;
  title: string;
  questionIds: string[];
  subjectId?: string | null;
  lessonId?: string | null;
  uploadId?: string | null;
}) {
  if (data.questionIds.length === 0) throw new HttpError(400, "Энэ тестэд асуулт алга байна.", "NO_QUESTIONS");
  return prisma.testSession.create({
    data: {
      userId: data.userId,
      mode: data.mode,
      title: data.title,
      questionIds: data.questionIds.slice(0, MAX_QUESTIONS_PER_TEST),
      subjectId: data.subjectId ?? null,
      lessonId: data.lessonId ?? null,
      uploadId: data.uploadId ?? null,
    },
  });
}

export async function getOwnedSession(userId: string, sessionId: string) {
  const session = await prisma.testSession.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== userId) throw notFound("Тест");
  return session;
}

function sessionHeader(s: TestSession, subjectName: string | null) {
  return {
    id: s.id,
    mode: s.mode,
    title: s.title,
    subjectId: s.subjectId,
    subjectName,
    lessonId: s.lessonId,
    uploadId: s.uploadId,
    status: s.status,
    startedAt: s.startedAt,
    submittedAt: s.submittedAt,
    durationSec: s.durationSec,
    scorePoints: s.scorePoints,
    totalPoints: s.totalPoints,
    percent: s.totalPoints ? Math.round(((s.scorePoints ?? 0) / s.totalPoints) * 100) : null,
    questionCount: s.questionIds.length,
  };
}

// For taking the test: never reveals which choice is correct. Once the
// session is submitted, the full review (answers, keys, explanations) is
// included instead.
export async function serializeSession(session: TestSession) {
  const [questions, subject] = await Promise.all([
    loadQuestions(session.questionIds),
    session.subjectId ? prisma.subject.findUnique({ where: { id: session.subjectId }, select: { name: true } }) : null,
  ]);
  const header = sessionHeader(session, subject?.name ?? null);

  if (session.status !== "SUBMITTED") {
    return {
      ...header,
      questions: questions.map((q) => ({
        id: q.id,
        type: q.type,
        prompt: q.prompt,
        choices: q.choices.map((c) => ({ id: c.id, label: c.label, text: c.text })),
      })),
    };
  }

  const answers = await prisma.answer.findMany({ where: { sessionId: session.id } });
  const answerByQ = new Map(answers.map((a) => [a.questionId, a]));
  return {
    ...header,
    questions: questions.map((q) => {
      const a = answerByQ.get(q.id);
      return {
        id: q.id,
        type: q.type,
        prompt: q.prompt,
        choices: q.choices.map((c) => ({ id: c.id, label: c.label, text: c.text, isCorrect: c.isCorrect })),
        correctText: q.correctText,
        explanation: q.explanation,
        gradable: isGradable(q),
        selectedChoiceId: a?.choiceId ?? null,
        answerText: a?.answerText ?? null,
        isCorrect: a?.isCorrect ?? null,
      };
    }),
  };
}

export type SubmittedAnswer = { questionId: string; choiceId?: string | null; answerText?: string | null };

export async function submitSession(session: TestSession, submitted: SubmittedAnswer[], durationSec?: number) {
  if (session.status === "SUBMITTED") throw new HttpError(409, "Энэ тест аль хэдийн илгээгдсэн.", "ALREADY_SUBMITTED");

  const questions = await loadQuestions(session.questionIds);
  const byQ = new Map(submitted.map((a) => [a.questionId, a]));

  let score = 0;
  let total = 0;
  const rows: Prisma.AnswerCreateManyInput[] = [];

  for (const q of questions) {
    const a = byQ.get(q.id);
    const gradable = isGradable(q);
    let isCorrect: boolean | null = null;
    let choiceId: string | null = null;
    let answerText: string | null = null;

    if (q.type === "MULTIPLE_CHOICE") {
      const choice = a?.choiceId ? q.choices.find((c) => c.id === a.choiceId) : undefined;
      choiceId = choice?.id ?? null;
      if (gradable) isCorrect = Boolean(choice?.isCorrect);
    } else {
      answerText = a?.answerText?.trim() ? a.answerText.trim().slice(0, 2000) : null;
      if (gradable) {
        if (!answerText) isCorrect = false;
        else if (shortAnswerMatches(answerText, q.correctText!)) isCorrect = true;
        else isCorrect = (await shortAnswerMatchesSemantically(q.prompt, answerText, q.correctText!)) ?? false;
      }
    }

    if (gradable) total += q.points;
    const points = isCorrect ? q.points : 0;
    score += points;
    rows.push({ sessionId: session.id, questionId: q.id, choiceId, answerText, isCorrect, pointsAwarded: points });
  }

  const elapsed = Math.round((Date.now() - session.startedAt.getTime()) / 1000);
  const updated = await prisma.$transaction(async (tx) => {
    // Guard against a double submit racing past the status check above.
    const claimed = await tx.testSession.updateMany({
      where: { id: session.id, status: "IN_PROGRESS" },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        durationSec: Math.max(0, Math.min(durationSec ?? elapsed, elapsed + 5)),
        scorePoints: score,
        totalPoints: total,
      },
    });
    if (claimed.count === 0) throw new HttpError(409, "Энэ тест аль хэдийн илгээгдсэн.", "ALREADY_SUBMITTED");
    await tx.answer.createMany({ data: rows });
    return tx.testSession.findUniqueOrThrow({ where: { id: session.id } });
  });

  return serializeSession(updated);
}

export async function listSessions(userId: string, opts: { limit: number; subjectId?: string }) {
  const sessions = await prisma.testSession.findMany({
    where: { userId, status: "SUBMITTED", ...(opts.subjectId ? { subjectId: opts.subjectId } : {}) },
    orderBy: { submittedAt: "desc" },
    take: opts.limit,
    include: { subject: { select: { name: true } } },
  });
  return sessions.map((s) => sessionHeader(s, s.subject?.name ?? null));
}
