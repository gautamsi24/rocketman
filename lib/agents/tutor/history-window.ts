import type { UIMessage } from "ai";

// Shared by the chat route (what's sent raw to the model this turn) and the
// history-compaction agent (what counts as "fallen out of the window" and
// needs folding into the rolling summary) -- the two must stay in sync, or
// a turn would either be sent twice (raw + summarized) or dropped entirely.
export const SESSION_HISTORY_WINDOW_TURNS = 8;

/**
 * Trims a client-resent message history down to the last maxTurns user
 * turns (plus whatever assistant/tool messages follow the oldest of those).
 * Everything older is expected to be covered by the session's rolling
 * history_summary instead (see lib/agents/history-compaction), not simply
 * dropped -- this function only decides what's sent to the model raw.
 */
export function windowMessages(
  messages: UIMessage[],
  maxTurns: number
): UIMessage[] {
  const userIndices = messages
    .map((message, index) => (message.role === "user" ? index : -1))
    .filter((index) => index !== -1);
  if (userIndices.length <= maxTurns) return messages;
  return messages.slice(userIndices[userIndices.length - maxTurns]);
}
