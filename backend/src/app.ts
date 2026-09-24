import express from "express";
import cors from "cors";
import helmet from "helmet";
import { Prisma } from "@prisma/client";
import { HttpError } from "./lib/http";
import { authRouter } from "./routes/auth";
import { subjectsRouter } from "./routes/subjects";
import { testsRouter } from "./routes/tests";
import { uploadsRouter } from "./routes/uploads";
import { statsRouter } from "./routes/stats";

export function createApp() {
  const app = express();
  // Behind Render's (or any) single reverse proxy: trust one hop so rate
  // limiting keys on the real client IP.
  app.set("trust proxy", 1);
  // Pure JSON API (no HTML served), so helmet's defaults are safe as-is.
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/", (_req, res) => res.json({ name: "exam-prep-backend", ok: true }));
  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/auth", authRouter);
  app.use("/subjects", subjectsRouter);
  app.use("/tests", testsRouter);
  app.use("/uploads", uploadsRouter);
  app.use("/stats", statsRouter);

  app.use((_req: express.Request, _res: express.Response, next: express.NextFunction) => {
    next(new HttpError(404, "Хүсэлт олдсонгүй.", "NOT_FOUND"));
  });

  // Express 5 forwards rejected promises from async handlers here.
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: err.message, code: err.code, ...err.extra });
    }
    // express.json() parse failures.
    if (err && typeof err === "object" && "type" in err && (err as { type: string }).type === "entity.parse.failed") {
      return res.status(400).json({ error: "Хүсэлтийн өгөгдөл буруу байна.", code: "BAD_JSON" });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return res.status(404).json({ error: "Мэдээлэл олдсонгүй.", code: "NOT_FOUND" });
    }
    console.error(err);
    res.status(500).json({ error: "Серверт алдаа гарлаа. Дахин оролдоно уу.", code: "INTERNAL" });
  });

  return app;
}
