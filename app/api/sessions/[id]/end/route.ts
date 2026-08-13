import { NextResponse } from "next/server";
import { consolidateSession } from "@/lib/agents/consolidation";
import { requireLearnerContext, requireSessionOwner } from "@/lib/api/guards";

export async function POST(
  _req: Request,
  ctx: RouteContext<"/api/sessions/[id]/end">
) {
  const { id } = await ctx.params;

  const auth = await requireLearnerContext();
  if (auth instanceof NextResponse) return auth;
  const { learnerId, supabase } = auth;

  const ownershipError = await requireSessionOwner(supabase, id, learnerId);
  if (ownershipError) return ownershipError;

  const result = await consolidateSession(supabase, id);

  return NextResponse.json(result);
}
