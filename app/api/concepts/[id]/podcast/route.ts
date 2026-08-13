import { NextResponse } from "next/server";
import { getOrCreatePodcast } from "@/lib/agents/podcast";
import { forbidden, requireLearnerContext } from "@/lib/api/guards";
import { getConceptTenantId } from "@/lib/curriculum/concepts";

export const maxDuration = 60;

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/concepts/[id]/podcast">
) {
  const auth = await requireLearnerContext();
  if (auth instanceof NextResponse) return auth;
  const { learner, supabase } = auth;

  const { id } = await ctx.params;

  // Never serve (or generate + meter TTS for) another tenant's podcast audio.
  const tenantId = await getConceptTenantId(supabase, id);
  if (!tenantId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (tenantId !== learner.tenantId) {
    return forbidden();
  }

  const { audio, mediaType } = await getOrCreatePodcast(supabase, id, tenantId);

  return new Response(new Uint8Array(audio), {
    headers: { "Content-Type": mediaType },
  });
}
