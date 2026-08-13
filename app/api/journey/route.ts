import { NextResponse } from "next/server";
import { requireLearnerId } from "@/lib/api/guards";
import { buildJourney } from "@/lib/journey/read";
import { getLearner } from "@/lib/learners/learner";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const maxDuration = 30;

// Same journey the page server-renders, exposed for the client to refetch after
// a graded check answer moves mastery -- so the map/completion update live
// instead of only on a full refresh.
export async function GET() {
  const learnerId = await requireLearnerId();
  if (learnerId instanceof NextResponse) return learnerId;

  const supabase = createServiceRoleClient();
  const learner = await getLearner(supabase, learnerId);
  const journey = await buildJourney(supabase, {
    tenantId: learner.tenantId,
    learnerId,
  });

  return NextResponse.json(journey);
}
