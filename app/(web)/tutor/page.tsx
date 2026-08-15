import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";
import { masteryToSequentialColor } from "@/lib/client/palette";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  listLearnersWithProgress,
  type LearnerProgress,
} from "@/lib/tutor-console/read";

function MasteryBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: masteryToSequentialColor(value) }}
        />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
    </div>
  );
}

function LearnerRow({ learner }: { learner: LearnerProgress }) {
  return (
    <tr className="border-b last:border-0">
      <td className="py-3 pr-4 pl-4 font-medium">
        <Link href={`/tutor/learners/${learner.id}`} className="hover:underline">
          {learner.displayName}
        </Link>
      </td>
      <td className="py-3 pr-4 tabular-nums">
        {learner.masteredCount}/{learner.totalConcepts}
      </td>
      <td className="py-3 pr-4">
        <MasteryBar value={learner.avgMastery} />
      </td>
      <td className="py-3 pr-4 tabular-nums">
        {learner.activeMisconceptions > 0 ? (
          <span className="text-amber-600">{learner.activeMisconceptions}</span>
        ) : (
          <span className="text-muted-foreground">0</span>
        )}
      </td>
      <td className="py-3 text-sm text-muted-foreground">
        {learner.lastActiveAt
          ? new Date(learner.lastActiveAt).toLocaleDateString()
          : "never"}
      </td>
    </tr>
  );
}

export default async function TutorDashboardPage() {
  await requireRole("tutor");

  const supabase = createServiceRoleClient();
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .limit(1)
    .maybeSingle();
  const learners = tenant
    ? await listLearnersWithProgress(supabase, tenant.id)
    : [];
  learners.sort((a, b) => b.avgMastery - a.avgMastery);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-6">
      <div>
        <h1 className="text-xl font-semibold">Students</h1>
        <p className="text-sm text-muted-foreground">
          {learners.length} learner{learners.length === 1 ? "" : "s"} · progress
          across {learners[0]?.totalConcepts ?? 0} topics
        </p>
      </div>

      {learners.length === 0 ? (
        <p className="text-sm text-muted-foreground">No learners yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 pl-4 font-medium">Student</th>
                <th className="py-2 pr-4 font-medium">Mastered</th>
                <th className="py-2 pr-4 font-medium">Avg mastery</th>
                <th className="py-2 pr-4 font-medium">Misconceptions</th>
                <th className="py-2 font-medium">Last active</th>
              </tr>
            </thead>
            <tbody>
              {learners.map((learner) => (
                <LearnerRow key={learner.id} learner={learner} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
