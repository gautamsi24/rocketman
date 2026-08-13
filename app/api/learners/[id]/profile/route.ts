import { NextResponse } from "next/server";
import { requireLearnerOwnsContext } from "@/lib/api/guards";
import { buildLearnerProfile } from "@/lib/profile/read";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/learners/[id]/profile">
) {
  const { id } = await ctx.params;

  const auth = await requireLearnerOwnsContext(id);
  if (auth instanceof NextResponse) return auth;
  const { learner, supabase } = auth;

  const profile = await buildLearnerProfile(supabase, {
    tenantId: learner.tenantId,
    learnerId: learner.id,
  });

  return NextResponse.json(profile);
}
