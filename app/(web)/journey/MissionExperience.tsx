"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ChatPanel, type PanelTopic } from "./ChatPanel";
import { MissionMap } from "./MissionMap";
import type { JourneyResponse } from "@/lib/journey/types";
import { cn } from "@/lib/utils";

export function MissionExperience({
  journey: initialJourney,
}: {
  journey: JourneyResponse;
}) {
  // Seeded from the server render, then kept live on the client: a graded check
  // answer that moves mastery refetches this so the map updates without a
  // full-page refresh.
  const [journey, setJourney] = useState(initialJourney);
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const creatingSessionRef = useRef(false);

  const refreshJourney = useCallback(() => {
    fetch("/api/journey")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to refresh journey");
        return res.json();
      })
      .then((next: JourneyResponse) => setJourney(next))
      .catch(() => {
        // A failed refresh just leaves the last-known map on screen; the next
        // graded answer (or a page refresh) will reconcile it.
      });
  }, []);

  // A session is created lazily on the first topic open (not just browsing).
  // Driven by the selection event, not an effect, so re-selecting a topic after
  // a failed creation retries instead of staying stuck.
  const ensureSession = useCallback(() => {
    if (sessionId || creatingSessionRef.current) return;
    creatingSessionRef.current = true;
    fetch("/api/sessions", { method: "POST" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to start session");
        return res.json();
      })
      .then((session: { id: string }) => setSessionId(session.id))
      .catch(() => {
        // Session creation failed; re-selecting the topic retries via the
        // selection handler, so nothing to do here.
      })
      .finally(() => {
        creatingSessionRef.current = false;
      });
  }, [sessionId]);

  const handleSelectConcept = useCallback(
    (conceptId: string) => {
      setSelectedConceptId(conceptId);
      ensureSession();
    },
    [ensureSession]
  );

  const topicByConceptId = useMemo(() => {
    const map = new Map<string, PanelTopic>();
    for (const unit of journey.units) {
      for (const node of unit.nodes) {
        map.set(node.conceptId, {
          conceptId: node.conceptId,
          label: node.label,
          unitLabel: unit.unitLabel,
          scope: node.scope,
        });
      }
    }
    return map;
  }, [journey]);

  const selectedTopic = selectedConceptId
    ? topicByConceptId.get(selectedConceptId) ?? null
    : null;

  return (
    <div className="flex min-h-0 flex-1">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <MissionMap
          journey={journey}
          onSelectConcept={handleSelectConcept}
          selectedConceptId={selectedConceptId}
        />
      </div>

      <aside
        className={cn(
          "min-h-0 flex-col border-l bg-background lg:flex lg:w-[420px] lg:static lg:z-auto",
          selectedConceptId ? "fixed inset-0 z-50 flex" : "hidden"
        )}
      >
        <ChatPanel
          onClose={() => setSelectedConceptId(null)}
          onConceptSwitch={setSelectedConceptId}
          onMasteryChanged={refreshJourney}
          sessionId={sessionId}
          topic={selectedTopic}
        />
      </aside>
    </div>
  );
}
