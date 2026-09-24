import { prisma } from "../lib/prisma";

export type Accuracy = { attempted: number; correct: number; accuracy: number | null };

const accuracy = (attempted: number, correct: number): Accuracy => ({
  attempted,
  correct,
  accuracy: attempted ? Math.round((correct / attempted) * 100) : null,
});

// Graded answers in submitted tests, grouped by bank lesson.
export async function lessonAccuracy(userId: string): Promise<Map<string, Accuracy>> {
  const rows = await prisma.$queryRaw<{ lessonId: string; attempted: number; correct: number }[]>`
    SELECT q."lessonId",
           COUNT(*)::int AS attempted,
           COUNT(*) FILTER (WHERE a."isCorrect")::int AS correct
    FROM "Answer" a
    JOIN "TestSession" s ON s.id = a."sessionId"
    JOIN "Question" q ON q.id = a."questionId"
    WHERE s."userId" = ${userId} AND s.status = 'SUBMITTED'
      AND q."lessonId" IS NOT NULL AND a."isCorrect" IS NOT NULL
    GROUP BY q."lessonId"`;
  return new Map(rows.map((r) => [r.lessonId, accuracy(r.attempted, r.correct)]));
}

export function sumAccuracy(items: Accuracy[]): Accuracy {
  const attempted = items.reduce((n, a) => n + a.attempted, 0);
  const correct = items.reduce((n, a) => n + a.correct, 0);
  return accuracy(attempted, correct);
}

export const EMPTY_ACCURACY: Accuracy = accuracy(0, 0);

// Mongolia is UTC+8 year-round (no DST since 2017), so day boundaries for
// streaks and the activity chart are computed in that fixed offset.
const TZ_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
export const localDay = (d: Date) => Math.floor((d.getTime() + TZ_OFFSET_MS) / DAY_MS);
const dayLabel = (day: number) => new Date(day * DAY_MS).toISOString().slice(0, 10);

export async function overview(userId: string, now = new Date()) {
  const sessions = await prisma.testSession.findMany({
    where: { userId, status: "SUBMITTED" },
    select: { submittedAt: true, durationSec: true, scorePoints: true, totalPoints: true },
  });

  const activeDays = new Set(sessions.map((s) => localDay(s.submittedAt!)));
  const today = localDay(now);
  // A streak survives until the end of today even if today has no test yet.
  let streak = 0;
  for (let d = activeDays.has(today) ? today : today - 1; activeDays.has(d); d--) streak++;

  const last7: { date: string; tests: number; correct: number; total: number }[] = [];
  for (let d = today - 6; d <= today; d++) last7.push({ date: dayLabel(d), tests: 0, correct: 0, total: 0 });
  for (const s of sessions) {
    const idx = localDay(s.submittedAt!) - (today - 6);
    if (idx >= 0 && idx < 7) {
      last7[idx].tests++;
      last7[idx].correct += s.scorePoints ?? 0;
      last7[idx].total += s.totalPoints ?? 0;
    }
  }

  const correct = sessions.reduce((n, s) => n + (s.scorePoints ?? 0), 0);
  const total = sessions.reduce((n, s) => n + (s.totalPoints ?? 0), 0);
  return {
    testsTaken: sessions.length,
    questionsAnswered: total,
    correctAnswers: correct,
    accuracy: total ? Math.round((correct / total) * 100) : null,
    totalTimeSec: sessions.reduce((n, s) => n + (s.durationSec ?? 0), 0),
    streakDays: streak,
    activeToday: activeDays.has(today),
    last7Days: last7,
  };
}
