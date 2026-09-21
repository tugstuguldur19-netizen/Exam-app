import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { shortAnswerMatches } from "../services/grading";

export const attemptsRouter = Router();
attemptsRouter.use(requireAuth);

async function assertSubscribed(userId: string, subjectId: string) {
  const sub = await prisma.subscription.findFirst({
    where: { userId, subjectId, status: "active", endAt: { gt: new Date() } },
  });
  return Boolean(sub);
}

attemptsRouter.post("/exams/:examId/attempts", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const { examId } = req.params;
  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  if (!exam || exam.status !== "READY") return res.status(404).json({ error: "Exam not found" });

  if (!(await assertSubscribed(userId, exam.subjectId))) {
    return res.status(403).json({ error: "No active subscription for this subject", code: "SUBSCRIPTION_REQUIRED" });
  }

  const existing = await prisma.examAttempt.findFirst({
    where: { examId, userId, status: "IN_PROGRESS" },
  });
  const attempt = existing ?? (await prisma.examAttempt.create({ data: { examId, userId } }));

  res.status(201).json({ attemptId: attempt.id, examId, status: attempt.status });
});

const submitSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string(),
      choiceId: z.string().optional(),
      answerText: z.string().optional(),
    })
  ),
});

attemptsRouter.post("/attempts/:attemptId/submit", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const { attemptId } = req.params;
  const parsed = submitSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: { exam: { include: { questions: { include: { choices: true } } } } },
  });
  if (!attempt || attempt.userId !== userId) return res.status(404).json({ error: "Attempt not found" });
  if (attempt.status === "SUBMITTED") return res.status(409).json({ error: "Attempt already submitted" });

  const questionsById = new Map(attempt.exam.questions.map((q) => [q.id, q]));
  let scorePoints = 0;
  let totalPoints = 0; // only gradable questions count toward the total

  const responseRows = parsed.data.answers.map((answer) => {
    const question = questionsById.get(answer.questionId);
    if (!question) return null;

    let isCorrect: boolean | null = null;
    let pointsAwarded = 0;

    if (question.type === "MULTIPLE_CHOICE") {
      const correctChoice = question.choices.find((c) => c.isCorrect);
      if (correctChoice) {
        totalPoints += question.points;
        isCorrect = answer.choiceId === correctChoice.id;
        if (isCorrect) {
          pointsAwarded = question.points;
          scorePoints += question.points;
        }
      }
    } else if (question.type === "SHORT_ANSWER") {
      if (question.correctText) {
        totalPoints += question.points;
        isCorrect = shortAnswerMatches(answer.answerText ?? "", question.correctText);
        if (isCorrect) {
          pointsAwarded = question.points;
          scorePoints += question.points;
        }
      }
    }

    return {
      attemptId,
      questionId: question.id,
      choiceId: answer.choiceId ?? null,
      answerText: answer.answerText ?? null,
      isCorrect,
      pointsAwarded,
    };
  }).filter((r): r is NonNullable<typeof r> => r !== null);

  await prisma.$transaction([
    prisma.answerResponse.deleteMany({ where: { attemptId } }),
    prisma.answerResponse.createMany({ data: responseRows }),
    prisma.examAttempt.update({
      where: { id: attemptId },
      data: { status: "SUBMITTED", submittedAt: new Date(), scorePoints, totalPoints },
    }),
  ]);

  res.json({ attemptId, scorePoints, totalPoints });
});

attemptsRouter.get("/attempts/:attemptId", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const { attemptId } = req.params;
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: true,
      responses: {
        include: { question: { include: { choices: true } }, choice: true },
      },
    },
  });
  if (!attempt || attempt.userId !== userId) return res.status(404).json({ error: "Attempt not found" });

  const revealAnswers = attempt.status === "SUBMITTED";

  res.json({
    id: attempt.id,
    examId: attempt.examId,
    examTitle: attempt.exam.title,
    status: attempt.status,
    scorePoints: attempt.scorePoints,
    totalPoints: attempt.totalPoints,
    responses: attempt.responses.map((r) => {
      const yourChoice = r.choiceId ? r.question.choices.find((c) => c.id === r.choiceId) : null;
      const correctChoice = r.question.choices.find((c) => c.isCorrect);
      return {
        questionId: r.questionId,
        prompt: r.question.prompt,
        type: r.question.type,
        choices: r.question.choices.map((c) => ({ id: c.id, label: c.label, text: c.text })),
        yourChoiceId: r.choiceId,
        yourChoiceLabel: yourChoice ? `${yourChoice.label}. ${yourChoice.text}` : null,
        yourAnswerText: r.answerText,
        isCorrect: r.isCorrect,
        ...(revealAnswers
          ? {
              correctChoiceId: correctChoice?.id ?? null,
              correctChoiceLabel: correctChoice ? `${correctChoice.label}. ${correctChoice.text}` : null,
              correctText: r.question.correctText,
            }
          : {}),
      };
    }),
  });
});
