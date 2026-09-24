import { prisma } from "../lib/prisma";
import { HttpError } from "../lib/http";

export const FREE_UPLOADS_PER_WINDOW = 1;
export const UPLOAD_WINDOW_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

// subjectId → latest end date among the user's still-active subscriptions.
export async function activeSubscriptions(userId: string, now = new Date()) {
  const subs = await prisma.subscription.findMany({
    where: { userId, endAt: { gt: now } },
    include: { plan: { select: { name: true } } },
    orderBy: { endAt: "asc" },
  });
  const bySubject = new Map<string, { endAt: Date; planName: string }>();
  for (const s of subs) bySubject.set(s.subjectId, { endAt: s.endAt, planName: s.plan.name });
  return bySubject;
}

export async function assertSubscribed(userId: string, subjectId: string) {
  const sub = await prisma.subscription.findFirst({
    where: { userId, subjectId, endAt: { gt: new Date() } },
    select: { id: true },
  });
  if (!sub) {
    throw new HttpError(
      403,
      "Энэ хичээлийн тестүүдийг ашиглахын тулд эрх авна уу. Туршилтын тест үнэгүй.",
      "SUBSCRIPTION_REQUIRED",
      { subjectId }
    );
  }
}

export type UploadQuota = {
  unlimited: boolean;
  limit: number;
  used: number;
  remaining: number;
  windowDays: number;
  // When the oldest upload in the window ages out (null if one is available now).
  nextAvailableAt: string | null;
};

// Free accounts get FREE_UPLOADS_PER_WINDOW uploads per rolling
// UPLOAD_WINDOW_DAYS; any active subscription lifts the limit.
export async function uploadQuota(userId: string, now = new Date()): Promise<UploadQuota> {
  const hasSubscription = (await activeSubscriptions(userId, now)).size > 0;
  const since = new Date(now.getTime() - UPLOAD_WINDOW_DAYS * DAY_MS);
  const recent = await prisma.upload.findMany({
    where: { userId, createdAt: { gt: since } },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  const used = recent.length;
  const remaining = hasSubscription ? Infinity : Math.max(0, FREE_UPLOADS_PER_WINDOW - used);
  const nextAvailableAt =
    remaining > 0 || recent.length === 0
      ? null
      : new Date(recent[used - FREE_UPLOADS_PER_WINDOW].createdAt.getTime() + UPLOAD_WINDOW_DAYS * DAY_MS).toISOString();
  return {
    unlimited: hasSubscription,
    limit: FREE_UPLOADS_PER_WINDOW,
    used,
    remaining: hasSubscription ? -1 : remaining,
    windowDays: UPLOAD_WINDOW_DAYS,
    nextAvailableAt,
  };
}
