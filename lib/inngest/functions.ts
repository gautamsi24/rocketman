import { processTurnEvent } from "@/lib/agents/signal-extraction";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { inngest } from "./client";

// Inngest owns retry/backoff/dead-letter for dispatched rows (see
// processTurnEventFn's onFailure below); this sweep only recovers the narrow
// case where inngest.send() itself failed to enqueue the event after the
// turn_events row was inserted, so it doesn't need to react within seconds.
const STALE_THRESHOLD_MS = 5 * 60_000;

/**
 * Dispatches the async memory update (Signal-Extraction + BKT/misconception
 * writes) for one turn_events row. Retries with backoff on failure; onFailure
 * marks the row status: 'error' only once retries are exhausted, so a
 * transient failure (e.g. a flaky Gemini call) no longer abandons the row on
 * the first attempt.
 */
export const processTurnEventFn = inngest.createFunction(
  {
    id: "process-turn-event",
    retries: 4,
    triggers: [{ event: "turn_event/created" }],
    onFailure: async ({ event, error }) => {
      const { turnEventId } = event.data.event.data as { turnEventId: string };
      const supabase = createServiceRoleClient();
      await supabase
        .from("turn_events")
        .update({ status: "error", error_detail: error.message })
        .eq("id", turnEventId);
    },
  },
  async ({ event, step }) => {
    await step.run("process-turn-event", async () => {
      const supabase = createServiceRoleClient();
      await processTurnEvent(supabase, event.data.turnEventId);
    });
  }
);

/**
 * Backstop for turn_events rows whose inngest.send() call itself never
 * reached Inngest (the DB insert succeeded but the enqueue didn't) -- the one
 * failure mode Inngest's own retry logic can't cover, since it was never
 * told the work exists. Runs on Inngest's own schedule, not Vercel Cron, so
 * there's no separate HTTP endpoint or shared secret to manage.
 */
export const sweepStaleTurnEventsFn = inngest.createFunction(
  { id: "sweep-stale-turn-events", triggers: [{ cron: "*/5 * * * *" }] },
  async ({ step }) => {
    const supabase = createServiceRoleClient();
    const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS).toISOString();

    const stale = await step.run("find-stale-pending", async () => {
      const { data, error } = await supabase
        .from("turn_events")
        .select("id")
        .eq("status", "pending")
        .lt("created_at", cutoff);
      if (error) throw error;
      return data ?? [];
    });

    for (const row of stale) {
      await step.sendEvent(`resend-${row.id}`, {
        name: "turn_event/created",
        data: { turnEventId: row.id },
      });
    }
  }
);
