import { NextResponse } from "next/server";
import { requireLearnerContext } from "@/lib/api/guards";
import { listConcepts } from "@/lib/curriculum/concepts";

export async function GET() {
  const auth = await requireLearnerContext();
  if (auth instanceof NextResponse) return auth;
  const { learner, supabase } = auth;

  const concepts = await listConcepts(supabase, learner.tenantId);
  return NextResponse.json(concepts);
}
