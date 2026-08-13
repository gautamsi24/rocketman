import { NextResponse } from "next/server";
import { serverErrorResponse } from "@/lib/api/error-response";
import { requireLearnerContext } from "@/lib/api/guards";

export async function POST() {
  const auth = await requireLearnerContext();
  if (auth instanceof NextResponse) return auth;
  const { learner, supabase } = auth;

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
