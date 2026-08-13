import { ProfileView } from "./ProfileView";
import { requireLearner } from "@/lib/learners/require-learner";
import { buildLearnerProfile } from "@/lib/profile/read";

export default async function ProfilePage() {
  const { supabase, learner } = await requireLearner();
  const profile = await buildLearnerProfile(supabase, {
    tenantId: learner.tenantId,
    learnerId: learner.id,
  });

  return <ProfileView learnerId={learner.id} profile={profile} />;
}
