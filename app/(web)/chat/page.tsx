"use client";

import { useCallback, useEffect, useState } from "react";
import { ChatWindow } from "./ChatWindow";
import { PodcastButton } from "./PodcastButton";
import { TopicPicker } from "./TopicPicker";
import { Button } from "@/components/ui/button";
import { useCurrentLearner } from "@/hooks/use-current-learner";

export default function ChatPage() {
  const { learner } = useCurrentLearner();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState(false);
  const [conceptId, setConceptId] = useState<string | null>(null);

  const createSession = useCallback(() => {
    if (!learner) return;
    fetch("/api/sessions", { method: "POST" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to start session");
        return res.json();
      })
      .then((session: { id: string }) => {
        setSessionError(false);
        setSessionId(session.id);
      })
      .catch(() => setSessionError(true));
  }, [learner]);

  useEffect(() => {
    createSession();
  }, [createSession]);

  if (sessionError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Couldn&apos;t start a chat session.
        </p>
        <Button onClick={createSession}>Try again</Button>
      </div>
    );
  }

  if (!learner || !sessionId) {
    return <div className="flex flex-1 items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TopicPicker value={conceptId} onChange={setConceptId} />
        <PodcastButton conceptId={conceptId} />
      </div>

      <ChatWindow sessionId={sessionId} conceptId={conceptId} />
    </div>
  );
}
