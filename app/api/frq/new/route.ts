import { NextResponse } from "next/server";
import { serverErrorResponse } from "@/lib/api/error-response";
import { requireLearnerContext } from "@/lib/api/guards";
import { generateFrqSet } from "@/lib/curriculum/frq";

// Generating 6 grounded questions is several LLM calls.
export const maxDuration = 120;

// Generates a fresh practice set for the learner (weak-area targeted, grounded
// in curriculum content, never repeating an answered question).
export async function POST() {
  const auth = await requireLearnerContext();
  if (auth instanceof NextResponse) return auth;
  const { learnerId, learner, supabase } = auth;

  try {
    const set = await generateFrqSet(supabase, {
      tenantId: learner.tenantId,
      learnerId,
    });
    return NextResponse.json({ set });
  } catch (err) {
    return serverErrorResponse(err);
  }
}
