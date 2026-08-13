"use client";

import { MessagesSquareIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { CheckYourself } from "./CheckYourself";
import { ChatWindow } from "../chat/ChatWindow";
import { PodcastButton } from "../chat/PodcastButton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PanelTopic {
  conceptId: string;
  label: string;
  unitLabel: string | null;
  scope: "content" | "practice";
}

type PanelTab = "chat" | "check";

export function ChatPanel({
  sessionId,
  topic,
  onConceptSwitch,
  onMasteryChanged,
  onClose,
}: {
  sessionId: string | null;
  topic: PanelTopic | null;
  onConceptSwitch: (conceptId: string) => void;
  // A graded check answer moved mastery -- ask the map to refetch.
  onMasteryChanged: () => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<PanelTab>("chat");

  if (!topic) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <MessagesSquareIcon className="size-8 text-muted-foreground" />
        <p className="text-sm font-medium">Ask a doubt</p>
        <p className="text-sm text-muted-foreground">
          Pick a topic from your map to start a conversation and get clarity.
        </p>
      </div>
    );
  }

  // Quick check only applies to content topics; a stale "check" tab from a
  // previous content topic must not leak into a practice topic.
  const checkActive = topic.scope === "content" && tab === "check";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-start justify-between gap-2 border-b p-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            {topic.unitLabel ?? "Topic"}
          </p>
          <p className="truncate text-sm font-semibold">{topic.label}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {/* Practice skills (Argumentation, Questions & Methods) are
              interactive-only -- a passive podcast doesn't fit a reasoning
              skill, so it's hidden for practice-scope topics. When a content
              podcast finishes, jump the learner straight to a check question. */}
          {topic.scope === "content" ? (
            // Keyed by concept so switching topics remounts it -- the old
            // podcast stops (cleanup) instead of playing on under a new topic.
            <PodcastButton
              key={topic.conceptId}
              conceptId={topic.conceptId}
              onCompleted={() => setTab("check")}
            />
          ) : null}
          <Button
            aria-label="Close chat"
            className="lg:hidden"
            onClick={onClose}
            size="icon-sm"
            variant="ghost"
          >
            <XIcon className="size-4" />
          </Button>
        </div>
      </div>

      {/* Quick check is a content-topic drill. Practice skills (Argumentation,
          Questions & Methods) are exercised inside content via FRQ archetypes,
          so they're chat-only -- no standalone Quick check. */}
      {topic.scope === "content" ? (
        <div className="flex gap-1 border-b px-3 py-2">
          {(["chat", "check"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                tab === value
                  ? "bg-secondary font-medium text-secondary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {value === "chat" ? "Chat" : "Quick check"}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col">
        {/* Chat stays mounted (hidden) so the conversation isn't lost when the
            learner peeks at a check question. */}
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col p-3",
            checkActive && "hidden"
          )}
        >
          {sessionId ? (
            <ChatWindow
              conceptId={topic.conceptId}
              onConceptSwitch={onConceptSwitch}
              sessionId={sessionId}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Starting a session...
            </div>
          )}
        </div>

        {checkActive ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <CheckYourself
              key={topic.conceptId}
              conceptId={topic.conceptId}
              onExplore={() => setTab("chat")}
              onMasteryChanged={onMasteryChanged}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
