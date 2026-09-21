import express from "express";
import cors from "cors";
import helmet from "helmet";
import { authRouter } from "./routes/auth";
import { subjectsRouter } from "./routes/subjects";
import { examsRouter } from "./routes/exams";
import { attemptsRouter } from "./routes/attempts";

export function createApp() {
  const app = express();
  // Pure JSON API (no HTML served), so helmet's defaults — including CSP —
  // are safe to apply as-is; nothing here renders a browser-executed page.
  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/auth", authRouter);
  app.use("/subjects", subjectsRouter);
  // exams + attempts routers mount their own /subjects/:id/exams and
  // /exams/:id/... paths at root to keep exam access checks colocated.
  app.use("/", examsRouter);
  app.use("/", attemptsRouter);

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
