import { NextResponse } from "next/server";
import { processTurnEvent } from "@/lib/agents/signal-extraction";
import { createServiceRoleClient } from "@/lib/supabase/server";

const STALE_THRESHOLD_MS = 30_000;

async function sweep() {
  const supabase = createServiceRoleClient();
  const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS).toISOString();

  const { data: pending, error } = await supabase
    .from("turn_events")
    .select("id")
    .eq("status", "pending")
    .lt("created_at", cutoff);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  for (const row of pending ?? []) {
    await processTurnEvent(supabase, row.id);
  }

  return NextResponse.json({ processed: pending?.length ?? 0 });
}

export async function GET() {
  return sweep();
}

export async function POST() {
  return sweep();
}
