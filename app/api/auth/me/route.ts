import { NextResponse } from "next/server";
import { getSessionLearnerId } from "@/lib/auth/dal";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET() {
  const learnerId = await getSessionLearnerId();
  if (!learnerId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const { data: learner, error } = await supabase
    .from("learners")
    .select("id, display_name")
    .eq("id", learnerId)
    .maybeSingle();
  if (error || !learner) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  return NextResponse.json({ id: learner.id, displayName: learner.display_name });
}
