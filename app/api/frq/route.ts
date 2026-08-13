import { NextResponse } from "next/server";
import { requireLearnerContext } from "@/lib/api/guards";
import { getCurrentFrqSet } from "@/lib/curriculum/frq";

export const maxDuration = 30;

// The learner's current practice set (most recent), joined with their answers.
// Returns null when they have none yet -- generation is an explicit POST so a
// read never triggers a slow, billable LLM run.
export async function GET() {
  const auth = await requireLearnerContext();
  if (auth instanceof NextResponse) return auth;
  const { learnerId, learner, supabase } = auth;

  const set = await getCurrentFrqSet(supabase, {
    tenantId: learner.tenantId,
    learnerId,
  });

  return NextResponse.json({ set });
}
