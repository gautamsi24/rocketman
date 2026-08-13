import { NextResponse } from "next/server";
import { requireLearnerOwns } from "@/lib/api/guards";
import { getLearner } from "@/lib/learners/learner";
import { applyLearnerAssertion } from "@/lib/memory/profile-write";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(
  req: Request,
  ctx: RouteContext<"/api/learners/[id]/assert">
) {
  const { id } = await ctx.params;

  const auth = await requireLearnerOwns(id);
  if (auth instanceof NextResponse) return auth;

  const {
    conceptId,
    assertionType,
    note,
  }: {
    conceptId: string;
    assertionType: "knows_now" | "misconception_resolved";
    note?: string;
  } = await req.json();

  const supabase = createServiceRoleClient();
  const learner = await getLearner(supabase, id);

  const state = await applyLearnerAssertion(supabase, {
    tenantId: learner.tenantId,
    learnerId: learner.id,
    conceptId,
    assertionType,
    note,
  });

  return NextResponse.json(state);
}
