import { after } from "next/server";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { tutorModel } from "@/lib/agents/shared/model";
import { buildTutorContext } from "@/lib/agents/tutor/context";
import {
  SESSION_HISTORY_WINDOW_TURNS,
  windowMessages,
} from "@/lib/agents/tutor/history-window";
import { buildTutorInstructions } from "@/lib/agents/tutor/prompt";
import { sharePodcastTool, switchConceptTool } from "@/lib/agents/tutor/tools";
import { requireLearnerId, requireSessionOwner } from "@/lib/api/guards";
import { inngest } from "@/lib/inngest/client";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const maxDuration = 30;

function getLatestUserText(messages: UIMessage[]): string {
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUserMessage) return "";
  return lastUserMessage.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

export async function POST(req: Request) {
  const learnerId = await requireLearnerId();
  if (typeof learnerId !== "string") return learnerId;

  const {
    messages,
    sessionId,
    conceptId,
  }: {
    messages: UIMessage[];
    sessionId: string;
    conceptId: string;
  } = await req.json();

  const supabase = createServiceRoleClient();

  const ownershipError = await requireSessionOwner(supabase, sessionId, learnerId);
  if (ownershipError) return ownershipError;

  const learnerMessage = getLatestUserText(messages);

  // Older turns beyond the window are covered by the session's rolling
  // history_summary (lib/agents/history-compaction) instead of being resent
  // raw -- keeps per-turn cost from growing unbounded with session length
  // (SYSTEM_DESIGN.md §4.A).
  const { data: sessionRow } = await supabase
    .from("sessions")
    .select("history_summary")
    .eq("id", sessionId)
    .single();

  const context = await buildTutorContext(supabase, {
    learnerId,
    conceptId,
    learnerMessage,
    historySummary: sessionRow?.history_summary ?? null,
  });

  const result = streamText({
    model: tutorModel,
    instructions: buildTutorInstructions(context),
    messages: await convertToModelMessages(
      windowMessages(messages, SESSION_HISTORY_WINDOW_TURNS)
    ),
    tools: { switch_concept: switchConceptTool, share_podcast: sharePodcastTool },
    onError: ({ error }) => {
      console.error("chat stream error", error);
    },
    onEnd: async ({ text }) => {
      after(async () => {
        const { data: turnEvent, error } = await supabase
          .from("turn_events")
          .insert({
            tenant_id: context.tenantId,
            learner_id: learnerId,
            session_id: sessionId,
            concept_id: conceptId,
            learner_message: learnerMessage,
            tutor_message: text,
          })
          .select("id")
          .single();
        if (error) {
          console.error(error);
          return;
        }
        await inngest.send({
          name: "turn_event/created",
          data: { turnEventId: turnEvent.id, sessionId },
        });
      });
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
