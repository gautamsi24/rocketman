import { NextResponse } from "next/server";
import { consolidateSession } from "@/lib/agents/consolidation";
import { serverErrorResponse } from "@/lib/api/error-response";
import { forbidden, requireLearnerId } from "@/lib/api/guards";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(
  _req: Request,
  ctx: RouteContext<"/api/sessions/[id]/end">
) {
  const { id } = await ctx.params;

  const sessionLearnerId = await requireLearnerId();
  if (sessionLearnerId instanceof NextResponse) return sessionLearnerId;

  const supabase = createServiceRoleClient();

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("learner_id")
    .eq("id", id)
    .maybeSingle();
  if (sessionError) {
    return serverErrorResponse(sessionError);
  }
  if (!session || session.learner_id !== sessionLearnerId) {
    return forbidden();
  }

  const result = await consolidateSession(supabase, id);

  return NextResponse.json(result);
}
