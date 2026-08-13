import { redirect } from "next/navigation";
import { ProfileView } from "./ProfileView";
import { requireRole } from "@/lib/auth/require-role";
import { getLearnerOrNull } from "@/lib/learners/learner";
import { buildLearnerProfile } from "@/lib/profile/read";
import { createServiceRoleClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const session = await requireRole("learner");
  const learnerId = session.learnerId;
  if (!learnerId) redirect("/login");

  const supabase = createServiceRoleClient();
  const learner = await getLearnerOrNull(supabase, learnerId);
  if (!learner) redirect("/login");
  const profile = await buildLearnerProfile(supabase, {
    tenantId: learner.tenantId,
    learnerId,
  });

  return <ProfileView learnerId={learnerId} profile={profile} />;
}
