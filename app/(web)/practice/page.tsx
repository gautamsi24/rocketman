import { PracticeExperience } from "./PracticeExperience";
import { getCurrentFrqSet } from "@/lib/curriculum/frq";
import { requireLearner } from "@/lib/learners/require-learner";

export default async function PracticePage() {
  const { supabase, learner } = await requireLearner();

  // Read the current set fast; generation is client-triggered so the page never
  // blocks on a multi-call LLM run.
  const set = await getCurrentFrqSet(supabase, {
    tenantId: learner.tenantId,
    learnerId: learner.id,
  });

  return <PracticeExperience initialSet={set} />;
}
