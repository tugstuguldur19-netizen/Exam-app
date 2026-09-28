// Splits a total number of questions across lessons for an auto-built mixed
// test: every lesson that has questions gets at least one (when the total
// allows), and the rest is shared in proportion to how many questions each
// lesson still has available. Never assigns more than a lesson has.
export function distributeQuestions(
  total: number,
  lessons: { id: string; available: number }[],
  random: () => number = Math.random
): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(lessons.map((l) => [l.id, 0]));
  const pool = lessons.filter((l) => l.available > 0);
  const sum = pool.reduce((n, l) => n + l.available, 0);
  const want = Math.max(0, Math.floor(total));

  if (want >= sum) {
    for (const l of pool) counts[l.id] = l.available;
    return counts;
  }
  if (want < pool.length) {
    // Not enough for one each: pick lessons at random.
    const shuffled = [...pool].sort(() => random() - 0.5);
    for (const l of shuffled.slice(0, want)) counts[l.id] = 1;
    return counts;
  }

  for (const l of pool) counts[l.id] = 1;
  let remaining = want - pool.length;
  while (remaining > 0) {
    const open = pool.filter((l) => counts[l.id] < l.available);
    const capacity = open.reduce((n, l) => n + l.available - counts[l.id], 0);
    const shares = open.map((l) => ({ l, exact: (remaining * (l.available - counts[l.id])) / capacity }));
    let given = 0;
    for (const s of shares) {
      const add = Math.min(Math.floor(s.exact), s.l.available - counts[s.l.id]);
      counts[s.l.id] += add;
      given += add;
    }
    remaining -= given;
    // Hand out what's left by largest fractional share.
    shares.sort((a, b) => (b.exact % 1) - (a.exact % 1));
    for (const s of shares) {
      if (remaining === 0) break;
      if (counts[s.l.id] < s.l.available) {
        counts[s.l.id]++;
        remaining--;
      }
    }
  }
  return counts;
}
