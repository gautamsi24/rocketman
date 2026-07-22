const DECAY_FLOOR = 0.2;
const DEFAULT_HALF_LIFE_DAYS = 30;

export function applyDecay(
  masteryProb: number,
  lastPracticedAt: Date | null,
  now: Date,
  halfLifeDays: number = DEFAULT_HALF_LIFE_DAYS
): number {
  if (!lastPracticedAt) return masteryProb;

  const daysSince =
    (now.getTime() - lastPracticedAt.getTime()) / (1000 * 60 * 60 * 24);
  const decayFactor = Math.exp((-Math.LN2 * daysSince) / halfLifeDays);

  return DECAY_FLOOR + (masteryProb - DECAY_FLOOR) * decayFactor;
}
