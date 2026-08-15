"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function AddNoteForm({
  learnerId,
  questionId,
}: {
  learnerId: string;
  questionId: string;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!text.trim() || status === "saving") return;
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch(
        `/api/tutor/learners/${learnerId}/frq/${questionId}/notes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ noteText: text }),
        }
      );
      if (!res.ok) throw new Error("Could not save the note");
      setText("");
      // Re-fetch the server component so the new note shows up in the
      // shared list -- keeps note rendering in one place (the server-rendered
      // history) instead of duplicating it here.
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the note");
    } finally {
      setStatus("idle");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <textarea
        className="min-h-20 w-full resize-y rounded-lg border bg-background p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70"
        placeholder="Leave a suggestion for this student..."
        value={text}
        onChange={(event) => setText(event.target.value)}
        disabled={status === "saving"}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <Button
        size="sm"
        onClick={submit}
        disabled={!text.trim() || status === "saving"}
        className="self-start"
      >
        {status === "saving" ? "Saving..." : "Add suggestion"}
      </Button>
    </div>
  );
}
