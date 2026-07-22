import { NextResponse } from "next/server";
import { consolidateSession } from "@/lib/agents/consolidation";
import { getSessionLearnerId } from "@/lib/auth/dal";
import { deleteSessionCookie } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST() {
  const learnerId = await getSessionLearnerId();

  if (learnerId) {
    const supabase = createServiceRoleClient();
    const { data: activeSessions, error } = await supabase
      .from("sessions")
      .select("id")
      .eq("learner_id", learnerId)
      .eq("status", "active");
    if (!error) {
      for (const session of activeSessions ?? []) {
        await consolidateSession(supabase, session.id);
      }
    }
  }

  await deleteSessionCookie();
  return NextResponse.json({ ok: true });
}
