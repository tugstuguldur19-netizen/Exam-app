import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { HttpError, notFound, zodMessage } from "../lib/http";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { activeSubscriptions } from "../services/access";
import { mistakeQuestionIds } from "../services/tests";
import { EMPTY_ACCURACY, lessonAccuracy, sumAccuracy } from "../services/stats";

export const subjectsRouter = Router();
subjectsRouter.use(requireAuth);

const DAY_MS = 24 * 60 * 60 * 1000;

async function loadSubjects(where: { id?: string } = {}) {
  return prisma.subject.findMany({
    where,
    orderBy: { sortOrder: "asc" },
    include: {
      plans: { orderBy: { durationDays: "asc" } },
      lessons: {
        orderBy: { sortOrder: "asc" },
        include: { questions: { select: { isTrial: true } } },
      },
    },
  });
}

type LoadedSubject = Awaited<ReturnType<typeof loadSubjects>>[number];

function summarize(
  s: LoadedSubject,
  sub: { endAt: Date; planName: string } | undefined,
  acc: Map<string, { attempted: number; correct: number; accuracy: number | null }>
) {
  const lessons = s.lessons.map((l) => ({
    id: l.id,
    name: l.name,
    description: l.description,
    questionCount: l.questions.length,
    stats: acc.get(l.id) ?? EMPTY_ACCURACY,
  }));
  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    description: s.description,
    lessonCount: lessons.length,
    questionCount: lessons.reduce((n, l) => n + l.questionCount, 0),
    trialQuestionCount: s.lessons.reduce((n, l) => n + l.questions.filter((q) => q.isTrial).length, 0),
    subscription: sub ? { active: true, endAt: sub.endAt, planName: sub.planName } : null,
    plans: s.plans.map((p) => ({ id: p.id, name: p.name, durationDays: p.durationDays, price: p.price, currency: p.currency })),
    stats: sumAccuracy(lessons.map((l) => l.stats)),
    lessons,
  };
}

subjectsRouter.get("/", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const [subjects, subs, acc] = await Promise.all([loadSubjects(), activeSubscriptions(userId), lessonAccuracy(userId)]);
  res.json(subjects.map((s) => summarize(s, subs.get(s.id), acc)));
});

subjectsRouter.get("/:subjectId", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const { subjectId } = req.params;
  const [[subject], subs, acc] = await Promise.all([
    loadSubjects({ id: subjectId }),
    activeSubscriptions(userId),
    lessonAccuracy(userId),
  ]);
  if (!subject) throw notFound("Хичээл");
  const mistakes = await mistakeQuestionIds(userId, subjectId);
  res.json({ ...summarize(subject, subs.get(subject.id), acc), mistakeCount: mistakes.length });
});

const subscribeSchema = z.object({ planId: z.string({ required_error: "Багц сонгоно уу." }).min(1, "Багц сонгоно уу.") });

// Demo checkout: activates the plan immediately. A real deployment would
// create the subscription from a payment provider's webhook (QPay, SocialPay…)
// instead. Buying while already subscribed extends from the current end date.
subjectsRouter.post("/:subjectId/subscribe", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const { subjectId } = req.params;
  const parsed = subscribeSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, zodMessage(parsed.error), "VALIDATION");

  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: parsed.data.planId } });
  if (!plan || plan.subjectId !== subjectId) throw notFound("Багц");

  const now = new Date();
  const current = (await activeSubscriptions(userId, now)).get(subjectId);
  const startAt = current ? current.endAt : now;
  const sub = await prisma.subscription.create({
    data: { userId, subjectId, planId: plan.id, startAt, endAt: new Date(startAt.getTime() + plan.durationDays * DAY_MS) },
  });
  res.status(201).json({ id: sub.id, subjectId, planName: plan.name, startAt: sub.startAt, endAt: sub.endAt });
});
