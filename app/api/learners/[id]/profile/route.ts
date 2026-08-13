import { NextResponse } from "next/server";
import { requireLearnerOwns } from "@/lib/api/guards";
import { getLearner } from "@/lib/learners/learner";
import { buildLearnerProfile } from "@/lib/profile/read";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/learners/[id]/profile">
) {
  const { id } = await ctx.params;

  const auth = await requireLearnerOwns(id);
  if (auth instanceof NextResponse) return auth;

  const supabase = createServiceRoleClient();

  const learner = await getLearner(supabase, id);
  const profile = await buildLearnerProfile(supabase, {
    tenantId: learner.tenantId,
    learnerId: learner.id,
  });

  return NextResponse.json(profile);
}
