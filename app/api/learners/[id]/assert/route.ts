import { NextResponse } from "next/server";
import { requireLearnerOwnsContext } from "@/lib/api/guards";
import { applyLearnerAssertion } from "@/lib/memory/profile-write";

export async function POST(
  req: Request,
  ctx: RouteContext<"/api/learners/[id]/assert">
) {
  const { id } = await ctx.params;

  const auth = await requireLearnerOwnsContext(id);
  if (auth instanceof NextResponse) return auth;
  const { learner, supabase } = auth;

  const {
    conceptId,
    assertionType,
    note,
  }: {
    conceptId: string;
    assertionType: "knows_now" | "misconception_resolved";
    note?: string;
  } = await req.json();

  const state = await applyLearnerAssertion(supabase, {
    tenantId: learner.tenantId,
    learnerId: learner.id,
    conceptId,
    assertionType,
    note,
  });

  return NextResponse.json(state);
}
