import express from "express";
import cors from "cors";
import { env } from "./lib/env";
import { authRouter } from "./routes/auth";
import { subjectsRouter } from "./routes/subjects";
import { examsRouter } from "./routes/exams";
import { attemptsRouter } from "./routes/attempts";

const app = express();
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

app.listen(env.port, () => {
  console.log(`exam-prep backend listening on :${env.port}`);
});
