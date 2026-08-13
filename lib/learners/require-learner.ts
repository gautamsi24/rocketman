import "server-only";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getLearnerOrNull, type LearnerProfile } from "./learner";

/**
 * Server guard for a learner-scoped page: requires role "learner" and a live
 * learner row (redirects to /login otherwise), and hands back everything the
 * page's data loading needs in one call.
 */
export async function requireLearner(): Promise<{
  supabase: ReturnType<typeof createServiceRoleClient>;
  learner: LearnerProfile;
}> {
  const session = await requireRole("learner");
  if (!session.learnerId) redirect("/login");

  const supabase = createServiceRoleClient();
  const learner = await getLearnerOrNull(supabase, session.learnerId);
  if (!learner) redirect("/login");

  return { supabase, learner };
}
