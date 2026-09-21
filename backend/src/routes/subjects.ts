import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";

export const subjectsRouter = Router();

subjectsRouter.use(requireAuth);

// List all subjects with the caller's subscription state on each, so the
// app can render "locked / subscribe" vs "active until <date>" directly.
subjectsRouter.get("/", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const [subjects, subscriptions] = await Promise.all([
    prisma.subject.findMany({
      orderBy: { sortOrder: "asc" },
      include: { plans: true },
    }),
    prisma.subscription.findMany({
      where: { userId, status: "active", endAt: { gt: new Date() } },
    }),
  ]);

  const activeBySubject = new Map(subscriptions.map((s) => [s.subjectId, s]));

  res.json(
    subjects.map((subject) => {
      const active = activeBySubject.get(subject.id);
      return {
        id: subject.id,
        slug: subject.slug,
        name: subject.name,
        description: subject.description,
        isStarter: subject.isStarter,
        plans: subject.plans.map((p) => ({
          id: p.id,
          name: p.name,
          durationDays: p.durationDays,
          priceCents: p.priceCents,
          currency: p.currency,
        })),
        subscription: active
          ? { active: true, endAt: active.endAt }
          : { active: false },
      };
    })
  );
});

const subscribeSchema = z.object({
  planId: z.string(),
});

// Mock purchase endpoint: grants time-based access immediately.
// Swap this for real receipt validation (RevenueCat/StoreKit/Play Billing
// webhook, or Stripe for web) before shipping — see backend/README.md.
subjectsRouter.post("/:subjectId/subscribe", async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const { subjectId } = req.params;
  const parsed = subscribeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: parsed.data.planId },
  });
  if (!plan || plan.subjectId !== subjectId) {
    return res.status(404).json({ error: "Plan not found for this subject" });
  }

  const now = new Date();
  const existing = await prisma.subscription.findFirst({
    where: { userId, subjectId, status: "active", endAt: { gt: now } },
  });
  // Extend from the current expiry if already subscribed, otherwise from now.
  const base = existing ? existing.endAt : now;
  const endAt = new Date(base.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

  const subscription = existing
    ? await prisma.subscription.update({ where: { id: existing.id }, data: { endAt } })
    : await prisma.subscription.create({
        data: { userId, subjectId, planId: plan.id, startAt: now, endAt },
      });

  res.status(201).json({
    subscriptionId: subscription.id,
    subjectId,
    endAt: subscription.endAt,
  });
});
