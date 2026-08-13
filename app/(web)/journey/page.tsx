import { MissionExperience } from "./MissionExperience";
import { buildJourney } from "@/lib/journey/read";
import { requireLearner } from "@/lib/learners/require-learner";

export default async function JourneyPage() {
  const { supabase, learner } = await requireLearner();
  const journey = await buildJourney(supabase, {
    tenantId: learner.tenantId,
    learnerId: learner.id,
  });

  return <MissionExperience journey={journey} />;
}
