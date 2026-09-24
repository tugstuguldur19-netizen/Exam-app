import { NextFunction, Request, Response, Router } from "express";
import multer from "multer";
import mammoth from "mammoth";
import { prisma } from "../lib/prisma";
import { HttpError, notFound } from "../lib/http";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { uploadQuota } from "../services/access";
import { parseExamText, ParseResult } from "../services/docxParser";
import { extractQuestionsWithAI } from "../services/aiQuestionExtractor";

// A user's own .docx tests. Independent of subjects: anyone can upload, free
// accounts are limited to one upload per week (see uploadQuota).
export const uploadsRouter = Router();
uploadsRouter.use(requireAuth);

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.originalname.toLowerCase().endsWith(".docx");
    if (ok) cb(null, true);
    else cb(new HttpError(400, "Зөвхөн .docx (Word) файл оруулна уу.", "BAD_FILE_TYPE"));
  },
});

// multer reports fileFilter/size-limit failures via its callback; map them to
// the 400/413 the client can show instead of a generic 500.
function receiveDocx(req: Request, res: Response, next: NextFunction) {
  upload.single("file")(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(new HttpError(413, `Файл хэт том байна — дээд хэмжээ ${MAX_UPLOAD_BYTES / 1024 / 1024}MB.`, "FILE_TOO_LARGE"));
      }
      return next(new HttpError(400, "Файл хүлээн авахад алдаа гарлаа. Дахин оролдоно уу.", "BAD_UPLOAD"));
    }
    next(err);
  });
}

async function extractText(buffer: Buffer): Promise<string> {
  try {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  } catch {
    throw new HttpError(422, "Файлыг уншиж чадсангүй. Word (.docx) файл эсэхийг шалгана уу.", "UNREADABLE_FILE");
  }
}

uploadsRouter.get("/quota", async (req: AuthedRequest, res) => {
  res.json(await uploadQuota(req.userId!));
});

uploadsRouter.get("/", async (req: AuthedRequest, res) => {
  const uploads = await prisma.upload.findMany({
    where: { userId: req.userId!, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { questions: true } },
      sessions: {
        where: { status: "SUBMITTED" },
        orderBy: { submittedAt: "desc" },
        take: 1,
        select: { scorePoints: true, totalPoints: true, submittedAt: true },
      },
    },
  });
  res.json(
    uploads.map((u) => {
      const last = u.sessions[0];
      return {
        id: u.id,
        title: u.title,
        sourceFileName: u.sourceFileName,
        questionCount: u._count.questions,
        warnings: u.parseWarnings,
        extractionMode: u.extractionMode,
        createdAt: u.createdAt,
        lastResult: last
          ? {
              scorePoints: last.scorePoints,
              totalPoints: last.totalPoints,
              percent: last.totalPoints ? Math.round(((last.scorePoints ?? 0) / last.totalPoints) * 100) : null,
              submittedAt: last.submittedAt,
            }
          : null,
      };
    })
  );
});

// The body is consumed (multer) before any quota/validation response, so the
// client never sees a connection reset from replying mid-upload.
uploadsRouter.post("/", receiveDocx, async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const file = req.file;
  if (!file) throw new HttpError(400, "Файл сонгоно уу.", "NO_FILE");

  const quota = await uploadQuota(userId);
  if (!quota.unlimited && quota.remaining <= 0) {
    throw new HttpError(
      403,
      `Үнэгүй эрхээр ${quota.windowDays} хоногт ${quota.limit} файл оруулах боломжтой. Илүү ихийг оруулахын тулд аль нэг хичээлийн эрх авна уу.`,
      "UPLOAD_LIMIT_REACHED",
      { quota }
    );
  }

  const text = await extractText(file.buffer);
  let result: ParseResult = parseExamText(text);
  let extractionMode: "heuristic" | "ai" = "heuristic";

  // Let the AI fallback have a go when the heuristics found nothing, or
  // couldn't find answers for most of what they found.
  const ungraded = result.questions.filter((q) => !q.hasKnownAnswer).length;
  if (result.questions.length === 0 || ungraded > result.questions.length / 2) {
    const ai = await extractQuestionsWithAI(text);
    const aiGraded = ai.questions.filter((q) => q.hasKnownAnswer).length;
    if (aiGraded > result.questions.length - ungraded) {
      result = { title: result.title, questions: ai.questions, warnings: ai.warnings };
      extractionMode = "ai";
    }
  }

  if (result.questions.length === 0) {
    throw new HttpError(
      422,
      "Файлаас асуулт олдсонгүй. Асуултууд «1.», хувилбарууд «А)», хариулт «Хариулт: А» хэлбэртэй эсэхийг шалгана уу.",
      "NO_QUESTIONS_FOUND",
      { warnings: result.warnings }
    );
  }

  const fileTitle = file.originalname.replace(/\.docx$/i, "").trim();
  const bodyTitle = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  const title = (bodyTitle || result.title || fileTitle || "Миний тест").slice(0, 120);

  const created = await prisma.upload.create({
    data: {
      userId,
      title,
      sourceFileName: file.originalname.slice(0, 200),
      parseWarnings: result.warnings,
      extractionMode,
      questions: {
        create: result.questions.map((q) => ({
          order: q.order,
          type: q.type,
          prompt: q.prompt,
          correctText: q.correctText,
          explanation: q.explanation,
          choices: { create: q.choices.map((c, i) => ({ order: i, label: c.label, text: c.text, isCorrect: c.isCorrect })) },
        })),
      },
    },
  });

  res.status(201).json({
    id: created.id,
    title: created.title,
    questionCount: result.questions.length,
    gradableCount: result.questions.filter((q) => q.hasKnownAnswer).length,
    warnings: result.warnings,
    extractionMode,
    quota: await uploadQuota(userId),
  });
});

uploadsRouter.delete("/:uploadId", async (req: AuthedRequest, res) => {
  const upload = await prisma.upload.findUnique({ where: { id: req.params.uploadId } });
  if (!upload || upload.userId !== req.userId || upload.deletedAt) throw notFound("Файл");
  await prisma.upload.update({ where: { id: upload.id }, data: { deletedAt: new Date() } });
  res.json({ ok: true });
});
