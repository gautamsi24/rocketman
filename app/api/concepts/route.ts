import { NextResponse } from "next/server";
import { listConcepts } from "@/lib/curriculum/concepts";
import { serverErrorResponse } from "@/lib/api/error-response";
import { getSessionLearnerId } from "@/lib/auth/dal";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET() {
  const learnerId = await getSessionLearnerId();
  if (!learnerId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("id")
    .limit(1)
    .single();
  if (tenantError) {
    return serverErrorResponse(tenantError);
  }

  const concepts = await listConcepts(supabase, tenant.id);
  return NextResponse.json(concepts);
}
