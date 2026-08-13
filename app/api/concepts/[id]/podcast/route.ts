import { NextResponse } from "next/server";
import { getOrCreatePodcast } from "@/lib/agents/podcast";
import { forbidden, requireLearnerId } from "@/lib/api/guards";
import { getLearner } from "@/lib/learners/learner";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const maxDuration = 60;

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/concepts/[id]/podcast">
) {
  const learnerId = await requireLearnerId();
  if (learnerId instanceof NextResponse) return learnerId;

  const { id } = await ctx.params;
  const supabase = createServiceRoleClient();
  const learner = await getLearner(supabase, learnerId);

  // Never serve (or generate + meter TTS for) another tenant's podcast audio.
  const { data: concept, error: conceptError } = await supabase
    .from("concepts")
    .select("tenant_id")
    .eq("id", id)
    .maybeSingle();
  if (conceptError || !concept) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (concept.tenant_id !== learner.tenantId) {
    return forbidden();
  }

  const { audio, mediaType } = await getOrCreatePodcast(supabase, id);

  return new Response(new Uint8Array(audio), {
    headers: { "Content-Type": mediaType },
  });
}
