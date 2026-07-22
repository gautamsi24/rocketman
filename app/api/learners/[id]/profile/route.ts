import { NextResponse } from "next/server";
import { getSessionLearnerId } from "@/lib/auth/dal";
import { getLearner } from "@/lib/learners/learner";
import { buildLearnerProfile } from "@/lib/profile/read";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/learners/[id]/profile">
) {
  const { id } = await ctx.params;

  const sessionLearnerId = await getSessionLearnerId();
  if (!sessionLearnerId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (sessionLearnerId !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createServiceRoleClient();

  const learner = await getLearner(supabase, id);
  const profile = await buildLearnerProfile(supabase, {
    tenantId: learner.tenantId,
    learnerId: learner.id,
  });

  return NextResponse.json(profile);
}
