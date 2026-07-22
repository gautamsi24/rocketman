import { NextResponse } from "next/server";
import { listConcepts } from "@/lib/curriculum/concepts";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createServiceRoleClient();

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("id")
    .limit(1)
    .single();
  if (tenantError) {
    return NextResponse.json({ error: tenantError.message }, { status: 500 });
  }

  const concepts = await listConcepts(supabase, tenant.id);
  return NextResponse.json(concepts);
}
