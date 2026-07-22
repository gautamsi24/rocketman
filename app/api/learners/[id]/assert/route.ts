import { NextResponse } from "next/server";
import { getSessionLearnerId } from "@/lib/auth/dal";
import { getLearner } from "@/lib/learners/learner";
import { applyLearnerAssertion } from "@/lib/memory/profile-write";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(
  req: Request,
  ctx: RouteContext<"/api/learners/[id]/assert">
) {
  const { id } = await ctx.params;

  const sessionLearnerId = await getSessionLearnerId();
  if (!sessionLearnerId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (sessionLearnerId !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
