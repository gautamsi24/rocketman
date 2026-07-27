import { tool } from "ai";
import { z } from "zod";

// Both tools are client-resolved (no `execute`): the tool call streams to
// the client, which is the only place that can actually update conceptId
// state or play audio. See ChatWindow.tsx's onToolCall handler.

export const switchConceptTool = tool({
  description:
    "Switch the active topic/concept the tutoring session is grounded in, when the learner asks for a different topic or unit.",
  inputSchema: z.object({
    conceptId: z.string().describe("The id of the concept to switch to, from # AVAILABLE TOPICS."),
  }),
});

export const sharePodcastTool = tool({
  description:
    "Play the real cached podcast audio for a topic, when the learner asks for a podcast, audio version, or spoken summary.",
  inputSchema: z.object({
    conceptId: z.string().describe("The id of the concept to generate/play the podcast for, from # AVAILABLE TOPICS."),
  }),
});
