"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
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
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";

export function ChatWindow({
  sessionId,
  conceptId,
}: {
  sessionId: string;
  conceptId: string | null;
}) {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    throttle: 50,
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
                  {message.parts.map((part, i) =>
                    part.type === "text" ? (
                      <MessageResponse key={i}>{part.text}</MessageResponse>
                    ) : null
                  )}
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

      <PromptInput
        onSubmit={(message) => {
          if (!message.text.trim() || !conceptId) return;
          sendMessage(
            { text: message.text },
            { body: { sessionId, conceptId } }
          );
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
          <PromptInputSubmit status={status} disabled={!conceptId} />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
