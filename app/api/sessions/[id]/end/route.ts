import { NextResponse } from "next/server";
import { consolidateSession } from "@/lib/agents/consolidation";
import { getSessionLearnerId } from "@/lib/auth/dal";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(
  _req: Request,
  ctx: RouteContext<"/api/sessions/[id]/end">
) {
  const { id } = await ctx.params;

  const sessionLearnerId = await getSessionLearnerId();
  if (!sessionLearnerId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("learner_id")
    .eq("id", id)
    .maybeSingle();
  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }
  if (!session || session.learner_id !== sessionLearnerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await consolidateSession(supabase, id);

  return NextResponse.json(result);
}
