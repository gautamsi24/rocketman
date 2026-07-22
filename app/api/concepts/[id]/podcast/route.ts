import { NextResponse } from "next/server";
import { getOrCreatePodcast } from "@/lib/agents/podcast";
import { getSessionLearnerId } from "@/lib/auth/dal";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const maxDuration = 60;

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/concepts/[id]/podcast">
) {
  const learnerId = await getSessionLearnerId();
  if (!learnerId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const supabase = createServiceRoleClient();
  const { audio, mediaType } = await getOrCreatePodcast(supabase, id);

  return new Response(new Uint8Array(audio), {
    headers: { "Content-Type": mediaType },
  });
}
