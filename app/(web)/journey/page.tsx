import { redirect } from "next/navigation";
import { MissionExperience } from "./MissionExperience";
import { requireRole } from "@/lib/auth/require-role";
import { buildJourney } from "@/lib/journey/read";
import { getLearnerOrNull } from "@/lib/learners/learner";
import { createServiceRoleClient } from "@/lib/supabase/server";

export default async function JourneyPage() {
  const session = await requireRole("learner");
  const learnerId = session.learnerId;
  if (!learnerId) redirect("/login");

  const supabase = createServiceRoleClient();
  const learner = await getLearnerOrNull(supabase, learnerId);
  if (!learner) redirect("/login");
  const journey = await buildJourney(supabase, {
    tenantId: learner.tenantId,
    learnerId,
  });

  return <MissionExperience journey={journey} />;
}
