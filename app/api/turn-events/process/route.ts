import { NextResponse } from "next/server";
import { processTurnEvent } from "@/lib/agents/signal-extraction";
import { serverErrorResponse } from "@/lib/api/error-response";
import { createServiceRoleClient } from "@/lib/supabase/server";

const STALE_THRESHOLD_MS = 30_000;

function isAuthorized(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return req.headers.get("authorization") === `Bearer ${expected}`;
}

async function sweep(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS).toISOString();

  const { data: pending, error } = await supabase
    .from("turn_events")
    .select("id")
    .eq("status", "pending")
    .lt("created_at", cutoff);
  if (error) {
    return serverErrorResponse(error);
  }

  for (const row of pending ?? []) {
    await processTurnEvent(supabase, row.id);
  }

  return NextResponse.json({ processed: pending?.length ?? 0 });
}

export async function GET(req: Request) {
  return sweep(req);
}

export async function POST(req: Request) {
  return sweep(req);
}
