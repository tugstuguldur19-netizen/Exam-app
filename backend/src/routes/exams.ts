import { NextFunction, Request, Response, Router } from "express";
import multer from "multer";
import mammoth from "mammoth";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { requireActiveSubscription } from "../middleware/subscriptionGate";
import { parseExamText } from "../services/docxParser";
import { extractQuestionsWithAI } from "../services/aiQuestionExtractor";

export const examsRouter = Router();
examsRouter.use(requireAuth);

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.originalname.toLowerCase().endsWith(".docx");
    if (ok) cb(null, true);
    else cb(new Error("Only .docx files are accepted"));
  },
});

// multer reports fileFilter/size-limit failures via next(err), which would
// otherwise fall through to the app's generic 500 handler — turn them into
// the specific 400/413 the client can actually show the user.
function uploadSingleDocx(req: Request, res: Response, next: NextFunction) {
  upload.single("file")(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: `File too large — the limit is ${MAX_UPLOAD_BYTES / 1024 / 1024}MB` });
    }
    if (err instanceof Error) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  });
}

// Upload a .docx exam for a subject the caller is subscribed to. The file
// is parsed synchronously (docx text extraction + question parsing is fast);
// a queue-backed background job would replace this at real-world scale.
examsRouter.post(
  "/subjects/:subjectId/exams",
  requireActiveSubscription,
  uploadSingleDocx,
  async (req: AuthedRequest, res) => {
    const { subjectId } = req.params;
    const userId = req.userId!;
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "Missing file field 'file'" });
    }

    const exam = await prisma.exam.create({
      data: {
        subjectId,
        uploadedById: userId,
        title: req.body.title || file.originalname.replace(/\.docx$/i, ""),
        sourceFileName: file.originalname,
        status: "PROCESSING",
      },
    });

    try {
      const { value: text } = await mammoth.extractRawText({ buffer: file.buffer });

      let result = parseExamText(text);
      let extractionMode: "heuristic" | "ai" = "heuristic";

      if (result.questions.length === 0) {
        const aiResult = await extractQuestionsWithAI(text);
        if (aiResult.questions.length > 0) {
          result = aiResult;
          extractionMode = "ai";
        } else {
          result.warnings.push(...aiResult.warnings);
        }
      }

      if (result.questions.length === 0) {
        await prisma.exam.update({
          where: { id: exam.id },
          data: { status: "FAILED", parseWarnings: JSON.stringify(result.warnings) },
        });
        return res.status(422).json({
          error: "Could not extract any questions from this document",
          warnings: result.warnings,
        });
      }

      await prisma.$transaction(
        result.questions.map((q) =>
          prisma.question.create({
            data: {
              examId: exam.id,
              order: q.order,
              type: q.type,
              prompt: q.prompt,
              correctText: q.correctText,
              choices: { create: q.choices.map((c) => ({ label: c.label, text: c.text, isCorrect: c.isCorrect })) },
            },
          })
        )
      );

      await prisma.exam.update({
        where: { id: exam.id },
        data: {
          status: "READY",
          extractionMode,
          parseWarnings: result.warnings.length ? JSON.stringify(result.warnings) : null,
        },
      });

      res.status(201).json({
        examId: exam.id,
        status: "READY",
        questionCount: result.questions.length,
        warnings: result.warnings,
      });
    } catch (err) {
      await prisma.exam.update({
        where: { id: exam.id },
        data: { status: "FAILED", parseWarnings: JSON.stringify([String(err)]) },
      });
      res.status(500).json({ error: "Failed to process document" });
    }
  }
);

examsRouter.get("/subjects/:subjectId/exams", requireActiveSubscription, async (req, res) => {
  const { subjectId } = req.params;
  const exams = await prisma.exam.findMany({
    where: { subjectId, status: "READY" },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true } } },
  });
  res.json(
    exams.map((e) => ({
      id: e.id,
      title: e.title,
      questionCount: e._count.questions,
      createdAt: e.createdAt,
      warnings: e.parseWarnings ? (JSON.parse(e.parseWarnings) as string[]) : [],
    }))
  );
});

// Fetch an exam's questions for taking — never includes isCorrect / correctText.
examsRouter.get("/exams/:examId", async (req: AuthedRequest, res) => {
  const { examId } = req.params;
  const userId = req.userId!;
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { questions: { include: { choices: true }, orderBy: { order: "asc" } } },
  });
  if (!exam) return res.status(404).json({ error: "Exam not found" });

  const subscription = await prisma.subscription.findFirst({
    where: { userId, subjectId: exam.subjectId, status: "active", endAt: { gt: new Date() } },
  });
  if (!subscription) {
    return res.status(403).json({ error: "No active subscription for this subject", code: "SUBSCRIPTION_REQUIRED" });
  }

  res.json({
    id: exam.id,
    title: exam.title,
    questions: exam.questions.map((q) => ({
      id: q.id,
      order: q.order,
      type: q.type,
      prompt: q.prompt,
      choices: q.choices.map((c) => ({ id: c.id, label: c.label, text: c.text })),
    })),
  });
});
