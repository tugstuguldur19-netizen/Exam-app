import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { HttpError, notFound, zodMessage } from "../lib/http";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { assertSubscribed } from "../services/access";
import {
  MAX_QUESTIONS_PER_TEST,
  createSession,
  getOwnedSession,
  listSessions,
  mistakeQuestionIds,
  serializeSession,
  shuffle,
  submitSession,
} from "../services/tests";

export const testsRouter = Router();
testsRouter.use(requireAuth);

const count = z.number().int().min(0).max(MAX_QUESTIONS_PER_TEST);
const id = z.string().min(1);

const createSchema = z.discriminatedUnion(
  "mode",
  [
    // Free for everyone: the subject's curated trial questions.
    z.object({ mode: z.literal("TRIAL"), subjectId: id }),
    // One lesson; `count` random questions (all of them when omitted).
    z.object({ mode: z.literal("LESSON"), lessonId: id, count: count.optional() }),
    // Several lessons of one subject, with a question count per lesson.
    z.object({
      mode: z.literal("MIXED"),
      subjectId: id,
      lessons: z.array(z.object({ lessonId: id, count })).min(1, "Дор хаяж нэг сэдэв сонгоно уу."),
      shuffle: z.boolean().optional(),
    }),
    // Questions the user last answered wrong in this subject.
    z.object({ mode: z.literal("MISTAKES"), subjectId: id, count: count.optional() }),
    // The user's own uploaded .docx test.
    z.object({ mode: z.literal("UPLOAD"), uploadId: id, shuffle: z.boolean().optional() }),
  ],
  { errorMap: () => ({ message: "Тестийн төрөл буруу байна." }) }
);

async function subjectOrThrow(subjectId: string) {
  const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
  if (!subject) throw notFound("Хичээл");
  return subject;
}

testsRouter.post("/", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, zodMessage(parsed.error), "VALIDATION");
  const body = parsed.data;

  let session;
  switch (body.mode) {
    case "TRIAL": {
      const subject = await subjectOrThrow(body.subjectId);
      const questions = await prisma.question.findMany({
        where: { isTrial: true, lesson: { subjectId: subject.id } },
        orderBy: [{ lesson: { sortOrder: "asc" } }, { order: "asc" }],
        select: { id: true },
      });
      session = await createSession({
        userId,
        mode: "TRIAL",
        title: `${subject.name} — Туршилтын тест`,
        subjectId: subject.id,
        questionIds: questions.map((q) => q.id),
      });
      break;
    }

    case "LESSON": {
      const lesson = await prisma.lesson.findUnique({
        where: { id: body.lessonId },
        include: { questions: { select: { id: true } } },
      });
      if (!lesson) throw notFound("Сэдэв");
      await assertSubscribed(userId, lesson.subjectId);
      const ids = shuffle(lesson.questions.map((q) => q.id));
      session = await createSession({
        userId,
        mode: "LESSON",
        title: lesson.name,
        subjectId: lesson.subjectId,
        lessonId: lesson.id,
        questionIds: body.count ? ids.slice(0, body.count) : ids,
      });
      break;
    }

    case "MIXED": {
      const subject = await subjectOrThrow(body.subjectId);
      await assertSubscribed(userId, subject.id);
      const wanted = body.lessons.filter((l) => l.count > 0);
      if (wanted.length === 0) throw new HttpError(400, "Дор хаяж нэг асуулт сонгоно уу.", "NO_QUESTIONS");
      const lessons = await prisma.lesson.findMany({
        where: { id: { in: wanted.map((l) => l.lessonId) }, subjectId: subject.id },
        include: { questions: { select: { id: true } } },
      });
      if (lessons.length !== new Set(wanted.map((l) => l.lessonId)).size) {
        throw new HttpError(400, "Сонгосон сэдэв энэ хичээлд хамаарахгүй байна.", "VALIDATION");
      }
      const byId = new Map(lessons.map((l) => [l.id, l]));
      const picked = wanted.flatMap((w) => shuffle(byId.get(w.lessonId)!.questions.map((q) => q.id)).slice(0, w.count));
      if (picked.length > MAX_QUESTIONS_PER_TEST) {
        throw new HttpError(400, `Нэг тестэд хамгийн ихдээ ${MAX_QUESTIONS_PER_TEST} асуулт байна.`, "TOO_MANY");
      }
      session = await createSession({
        userId,
        mode: "MIXED",
        title: `${subject.name} — Холимог тест`,
        subjectId: subject.id,
        // Grouped by lesson by default; shuffled across lessons if asked.
        questionIds: body.shuffle === false ? picked : shuffle(picked),
      });
      break;
    }

    case "MISTAKES": {
      const subject = await subjectOrThrow(body.subjectId);
      await assertSubscribed(userId, subject.id);
      const ids = shuffle(await mistakeQuestionIds(userId, subject.id));
      if (ids.length === 0) throw new HttpError(400, "Алдсан асуулт алга байна. Сайн байна!", "NO_QUESTIONS");
      session = await createSession({
        userId,
        mode: "MISTAKES",
        title: `${subject.name} — Алдаагаа засах`,
        subjectId: subject.id,
        questionIds: body.count ? ids.slice(0, body.count) : ids,
      });
      break;
    }

    case "UPLOAD": {
      const upload = await prisma.upload.findUnique({
        where: { id: body.uploadId },
        include: { questions: { select: { id: true }, orderBy: { order: "asc" } } },
      });
      if (!upload || upload.userId !== userId || upload.deletedAt) throw notFound("Файл");
      const ids = upload.questions.map((q) => q.id);
      session = await createSession({
        userId,
        mode: "UPLOAD",
        title: upload.title,
        uploadId: upload.id,
        questionIds: body.shuffle ? shuffle(ids) : ids,
      });
      break;
    }
  }

  res.status(201).json(await serializeSession(session));
});

testsRouter.get("/", async (req: AuthedRequest, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
  const subjectId = typeof req.query.subjectId === "string" ? req.query.subjectId : undefined;
  res.json(await listSessions(req.userId!, { limit, subjectId }));
});

testsRouter.get("/:sessionId", async (req: AuthedRequest, res) => {
  const session = await getOwnedSession(req.userId!, req.params.sessionId);
  res.json(await serializeSession(session));
});

const submitSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: id,
        choiceId: z.string().nullish(),
        answerText: z.string().max(5000).nullish(),
      })
    )
    .max(MAX_QUESTIONS_PER_TEST),
  durationSec: z.number().int().min(0).optional(),
});

testsRouter.post("/:sessionId/submit", async (req: AuthedRequest, res) => {
  const parsed = submitSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, zodMessage(parsed.error), "VALIDATION");
  const session = await getOwnedSession(req.userId!, req.params.sessionId);
  res.json(await submitSession(session, parsed.data.answers, parsed.data.durationSec));
});

// Take the same questions again as a fresh session.
testsRouter.post("/:sessionId/retake", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const prev = await getOwnedSession(userId, req.params.sessionId);
  if (prev.mode !== "TRIAL" && prev.mode !== "UPLOAD" && prev.subjectId) await assertSubscribed(userId, prev.subjectId);
  if (prev.uploadId) {
    const upload = await prisma.upload.findUnique({ where: { id: prev.uploadId }, select: { deletedAt: true } });
    if (!upload || upload.deletedAt) throw notFound("Файл");
  }
  const session = await createSession({
    userId,
    mode: prev.mode,
    title: prev.title,
    subjectId: prev.subjectId,
    lessonId: prev.lessonId,
    uploadId: prev.uploadId,
    questionIds: prev.mode === "UPLOAD" || prev.mode === "TRIAL" ? prev.questionIds : shuffle(prev.questionIds),
  });
  res.status(201).json(await serializeSession(session));
});
