import { NextResponse } from "next/server";
import { serverErrorResponse } from "@/lib/api/error-response";
import { getSessionLearnerId } from "@/lib/auth/dal";
import { getLearner } from "@/lib/learners/learner";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST() {
  const learnerId = await getSessionLearnerId();
  if (!learnerId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const learner = await getLearner(supabase, learnerId);

  const { data: session, error } = await supabase
    .from("sessions")
    .insert({ tenant_id: learner.tenantId, learner_id: learner.id })
    .select("id, started_at, status")
    .single();
  if (error) {
    return serverErrorResponse(error);
  }

  return NextResponse.json(session);
}
