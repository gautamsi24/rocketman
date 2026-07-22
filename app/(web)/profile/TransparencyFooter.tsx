interface MasteryLike {
  attempts: number;
  lastPracticedAt: string | null;
}

export function TransparencyFooter({ mastery }: { mastery: MasteryLike[] }) {
  const totalAttempts = mastery.reduce((sum, m) => sum + m.attempts, 0);
  const lastPracticedTimestamps = mastery
    .map((m) => m.lastPracticedAt)
    .filter((t): t is string => t !== null)
    .map((t) => new Date(t).getTime());
  const mostRecent =
    lastPracticedTimestamps.length > 0 ? Math.max(...lastPracticedTimestamps) : null;

  return (
    <p className="text-xs text-muted-foreground">
      Based on {totalAttempts} recorded attempt{totalAttempts === 1 ? "" : "s"}
      {mostRecent ? ` -- most recent on ${new Date(mostRecent).toLocaleDateString()}` : ""}.
      Everything above traces back to an actual chat turn or a correction you made -- nothing is inferred without evidence.
    </p>
  );
}
