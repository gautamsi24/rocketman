import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import {
  compactSessionHistoryFn,
  processTurnEventFn,
  sweepStaleTurnEventsFn,
} from "@/lib/inngest/functions";

// Each step.run below is one HTTP invocation, and process-turn-event does a
// Gemini structured-output call plus several DB writes. Vercel's default
// (10s on Hobby) cuts that off mid-flight; every timeout burns one of
// processTurnEventFn's 4 retries, and exhausting them marks the row
// status: 'error', which the stale sweep does not pick up.
export const maxDuration = 60;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processTurnEventFn, compactSessionHistoryFn, sweepStaleTurnEventsFn],
});
