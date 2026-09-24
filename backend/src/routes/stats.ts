import { Router } from "express";
import { prisma } from "../lib/prisma";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { EMPTY_ACCURACY, lessonAccuracy, overview, sumAccuracy } from "../services/stats";

export const statsRouter = Router();
statsRouter.use(requireAuth);

statsRouter.get("/", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const [summary, acc, subjects] = await Promise.all([
    overview(userId),
    lessonAccuracy(userId),
    prisma.subject.findMany({
      orderBy: { sortOrder: "asc" },
      include: { lessons: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true } } },
    }),
  ]);

  const perSubject = subjects.map((s) => {
    const lessons = s.lessons.map((l) => ({ id: l.id, name: l.name, stats: acc.get(l.id) ?? EMPTY_ACCURACY }));
    const attempted = lessons.filter((l) => l.stats.attempted > 0);
    // Weakest lesson with enough answers to mean something.
    const weakest = attempted
      .filter((l) => l.stats.attempted >= 3)
      .sort((a, b) => (a.stats.accuracy ?? 0) - (b.stats.accuracy ?? 0))[0];
    return {
      id: s.id,
      slug: s.slug,
      name: s.name,
      stats: sumAccuracy(lessons.map((l) => l.stats)),
      weakestLesson: weakest ? { id: weakest.id, name: weakest.name, accuracy: weakest.stats.accuracy } : null,
      lessons,
    };
  });

  res.json({ ...summary, subjects: perSubject });
});
