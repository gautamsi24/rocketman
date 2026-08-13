import { NextResponse } from "next/server";
import { requireLearnerId } from "@/lib/api/guards";
import { listConcepts } from "@/lib/curriculum/concepts";
import { getLearner } from "@/lib/learners/learner";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET() {
  const learnerId = await requireLearnerId();
  if (learnerId instanceof NextResponse) return learnerId;

  const supabase = createServiceRoleClient();
  const learner = await getLearner(supabase, learnerId);

  const concepts = await listConcepts(supabase, learner.tenantId);
  return NextResponse.json(concepts);
}
