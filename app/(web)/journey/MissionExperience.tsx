"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatPanel, type PanelTab, type PanelTopic } from "./ChatPanel";
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
  // Separate from selectedConceptId -- the panel itself is always visible on
  // desktop (a two-pane layout), but on mobile it's a full-screen overlay
  // that must only appear from an explicit tap, not the auto-selected first
  // topic on landing (that would otherwise hijack the screen on load).
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [tab, setTab] = useState<PanelTab>("chat");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const creatingSessionRef = useRef(false);
  const didAutoSelectRef = useRef(false);

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
      setMobilePanelOpen(true);
      ensureSession();
    },
    [ensureSession]
  );

  // Land on the first topic already open, so the panel isn't just a blank
  // "pick a topic" placeholder -- but only on desktop's two-pane layout
  // (mobilePanelOpen stays false, see above). listConcepts orders by
  // unit_code, so units[0].nodes[0] is the curriculum-first topic, not an
  // arbitrary one.
  const firstConceptId = journey.units[0]?.nodes[0]?.conceptId ?? null;
  useEffect(() => {
    if (didAutoSelectRef.current || !firstConceptId) return;
    didAutoSelectRef.current = true;
    setSelectedConceptId(firstConceptId);
    ensureSession();
  }, [firstConceptId, ensureSession]);

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
          onPodcastCompleted={() => setTab("check")}
        />
      </div>

      <aside
        className={cn(
          "min-h-0 flex-col border-l bg-background lg:flex lg:flex-1 lg:static lg:z-auto",
          mobilePanelOpen ? "fixed inset-0 z-50 flex" : "hidden"
        )}
      >
        <ChatPanel
          onClose={() => setMobilePanelOpen(false)}
          onConceptSwitch={setSelectedConceptId}
          onMasteryChanged={refreshJourney}
          sessionId={sessionId}
          tab={tab}
          onTabChange={setTab}
          topic={selectedTopic}
        />
      </aside>
    </div>
  );
}
