"use client";

import { useEffect, useState } from "react";
import { ChatWindow } from "./ChatWindow";
import { PodcastButton } from "./PodcastButton";
import { TopicPicker } from "./TopicPicker";
import { useCurrentLearner } from "@/hooks/use-current-learner";

export default function ChatPage() {
  const { learner } = useCurrentLearner();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [conceptId, setConceptId] = useState<string | null>(null);

  useEffect(() => {
    if (!learner) return;
    fetch("/api/sessions", { method: "POST" })
      .then((res) => res.json())
      .then((session: { id: string }) => setSessionId(session.id));
  }, [learner]);

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
