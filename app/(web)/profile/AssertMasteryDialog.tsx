"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface ConceptOption {
  conceptId: string;
  label: string;
}

export function AssertMasteryDialog({
  learnerId,
  concepts,
  onAsserted,
}: {
  learnerId: string;
  concepts: ConceptOption[];
  onAsserted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [conceptId, setConceptId] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!conceptId) return;
    setSubmitting(true);
    try {
      await fetch(`/api/learners/${learnerId}/assert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conceptId,
          assertionType: "knows_now",
          note: note.trim() || undefined,
        }),
      });
      setOpen(false);
      setConceptId("");
      setNote("");
      onAsserted();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        Actually, I know this now
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tell RocketMan what you know</DialogTitle>
          <DialogDescription>
            This updates your mastery for that topic right away -- no need to re-answer
            questions to prove it.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Select value={conceptId} onValueChange={(v) => v && setConceptId(v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Which topic?" />
            </SelectTrigger>
            <SelectContent>
              {concepts.map((c) => (
                <SelectItem key={c.conceptId} value={c.conceptId}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Optional note -- what made this click?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={!conceptId || submitting}>
            {submitting ? "Saving..." : "Update my mastery"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
