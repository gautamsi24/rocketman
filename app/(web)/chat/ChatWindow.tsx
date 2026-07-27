"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { fetchPodcastAudioUrl } from "@/lib/client/podcast-audio";
import { MicButton } from "./MicButton";

interface TopicOption {
  id: string;
  unitLabel: string | null;
  contentLoLabel: string | null;
  practiceLabel: string | null;
}

type PodcastState = "loading" | "error" | { url: string };

function topicLabel(topic: TopicOption): string {
  return topic.contentLoLabel ?? topic.practiceLabel ?? "this topic";
}

export function ChatWindow({
  sessionId,
  conceptId,
  onConceptSwitch,
}: {
  sessionId: string;
  conceptId: string | null;
  onConceptSwitch: (conceptId: string) => void;
}) {
  const [topicById, setTopicById] = useState<Map<string, TopicOption>>(new Map());
  const [podcastState, setPodcastState] = useState<Record<string, PodcastState>>({});

  useEffect(() => {
    fetch("/api/concepts")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to load topics"))))
      .then((data: TopicOption[]) => {
        setTopicById(new Map(data.map((topic) => [topic.id, topic])));
      })
      .catch(() => {
        // Non-fatal: tool-call validation just fails closed (unknown ids are
        // rejected) until this loads, same as any other transient fetch gap.
      });
  }, []);

  const { messages, sendMessage, status, addToolOutput } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ messages, body }) => ({
        body: { sessionId, conceptId, messages, ...body },
      }),
    }),
    throttle: 50,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall: async ({ toolCall }) => {
      if (toolCall.toolName === "switch_concept") {
        const { conceptId: targetId } = toolCall.input as { conceptId: string };
        const valid = topicById.has(targetId);
        if (valid) onConceptSwitch(targetId);
        addToolOutput({
          tool: "switch_concept",
          toolCallId: toolCall.toolCallId,
          output: { switched: valid },
        });
        return;
      }

      if (toolCall.toolName === "share_podcast") {
        const { conceptId: targetId } = toolCall.input as { conceptId: string };
        if (!topicById.has(targetId)) {
          addToolOutput({
            tool: "share_podcast",
            toolCallId: toolCall.toolCallId,
            output: { ready: false },
          });
          return;
        }

        setPodcastState((prev) => ({ ...prev, [toolCall.toolCallId]: "loading" }));
        try {
          const url = await fetchPodcastAudioUrl(targetId);
          setPodcastState((prev) => ({ ...prev, [toolCall.toolCallId]: { url } }));
          addToolOutput({
            tool: "share_podcast",
            toolCallId: toolCall.toolCallId,
            output: { ready: true },
          });
        } catch {
          setPodcastState((prev) => ({ ...prev, [toolCall.toolCallId]: "error" }));
          addToolOutput({
            tool: "share_podcast",
            toolCallId: toolCall.toolCallId,
            output: { ready: false },
          });
        }
      }
    },
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              title="Ask RocketMan anything"
              description="Pick a topic above and start chatting -- hints adapt to what you already know."
            />
          ) : (
            messages.map((message) => (
              <Message key={message.id} from={message.role}>
                <MessageContent>
                  {message.parts.map((part, i) => {
                    if (part.type === "text") {
                      return <MessageResponse key={i}>{part.text}</MessageResponse>;
                    }
                    if (part.type === "tool-switch_concept") {
                      const input = part.input as { conceptId?: string } | undefined;
                      const topic = input?.conceptId ? topicById.get(input.conceptId) : undefined;
                      return (
                        <p key={i} className="text-xs italic text-muted-foreground">
                          Switched to: {topic ? topicLabel(topic) : "new topic"}
                        </p>
                      );
                    }
                    if (part.type === "tool-share_podcast") {
                      const state = podcastState[part.toolCallId];
                      if (state === "loading") {
                        return (
                          <p key={i} className="text-xs italic text-muted-foreground">
                            Generating podcast...
                          </p>
                        );
                      }
                      if (state === "error") {
                        return (
                          <p key={i} className="text-xs italic text-destructive">
                            Couldn&apos;t generate the podcast.
                          </p>
                        );
                      }
                      if (state && typeof state === "object") {
                        return <audio key={i} controls src={state.url} className="w-full" />;
                      }
                      return null;
                    }
                    return null;
                  })}
                </MessageContent>
              </Message>
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {status === "error" ? (
        <Alert variant="destructive">
          <AlertDescription>
            Something went wrong sending that message. Try again.
          </AlertDescription>
        </Alert>
      ) : null}

      <PromptInputProvider>
        <PromptInput
          onSubmit={(message) => {
            if (!message.text.trim() || !conceptId) return;
            sendMessage({ text: message.text });
          }}
        >
          <PromptInputBody>
            <PromptInputTextarea
              placeholder={
                conceptId
                  ? "Type your answer or question..."
                  : "Pick a topic to get started"
              }
              disabled={!conceptId}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <div className="ml-auto flex items-center gap-1">
              <MicButton disabled={!conceptId} />
              <PromptInputSubmit status={status} disabled={!conceptId} />
            </div>
          </PromptInputFooter>
        </PromptInput>
      </PromptInputProvider>
    </div>
  );
}
