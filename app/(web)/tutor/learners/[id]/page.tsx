import Link from "next/link";
import { notFound } from "next/navigation";
import { AddNoteForm } from "./AddNoteForm";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/require-role";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getLearnerFrqHistory, type TutorFrqAnswer } from "@/lib/tutor-console/frq";

function AnswerCard({
  answer,
  learnerId,
}: {
  answer: TutorFrqAnswer;
  learnerId: string;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">
          {answer.kind === "long" ? "Long response" : "Short response"}
        </Badge>
        <Badge variant="outline" className="capitalize">
          {answer.taskWord}
        </Badge>
        <Badge variant={answer.correct ? "default" : "destructive"}>
          {answer.awardedPoints ?? 0}/{answer.maxPoints} points
        </Badge>
        <span className="ml-auto text-xs text-muted-foreground">
          {new Date(answer.answeredAt).toLocaleDateString()}
        </span>
      </div>

      {answer.stimulus ? (
        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
          {answer.stimulus}
        </div>
      ) : null}

      <p className="text-sm font-medium">{answer.prompt}</p>

      <div className="rounded-lg border bg-background p-3 text-sm whitespace-pre-wrap">
        {answer.answerText || (
          <span className="text-muted-foreground">
            (No written answer -- diagram only)
          </span>
        )}
      </div>

      {answer.pointsDetail.length > 0 ? (
        <ul className="flex flex-col gap-1 text-sm">
          {answer.pointsDetail.map((point) => (
            <li key={point.code} className="flex justify-between gap-2">
              <span className={point.awarded ? "" : "text-muted-foreground"}>
                {point.text}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {point.awarded ? point.points : 0}/{point.points}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {answer.feedback ? (
        <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
          {answer.feedback}
        </p>
      ) : null}

      {answer.notes.length > 0 ? (
        <div className="flex flex-col gap-2">
          {answer.notes.map((note) => (
            <div
              key={note.id}
              className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-primary">
                Your suggestion — {new Date(note.createdAt).toLocaleDateString()}
              </p>
              <p className="mt-1 text-muted-foreground">{note.noteText}</p>
            </div>
          ))}
        </div>
      ) : null}

      <AddNoteForm learnerId={learnerId} questionId={answer.id} />
    </section>
  );
}

export default async function TutorLearnerPage(
  props: PageProps<"/tutor/learners/[id]">
) {
  await requireRole("tutor");
  const { id: learnerId } = await props.params;

  const supabase = createServiceRoleClient();
  const { data: learner } = await supabase
    .from("learners")
    .select("id, display_name")
    .eq("id", learnerId)
    .maybeSingle();
  if (!learner) notFound();

  const answers = await getLearnerFrqHistory(supabase, learnerId);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-6">
      <div>
        <Link href="/tutor" className="text-sm text-muted-foreground hover:underline">
          ← Students
        </Link>
        <h1 className="text-xl font-semibold">{learner.display_name}</h1>
        <p className="text-sm text-muted-foreground">
          {answers.length} answered FRQ{answers.length === 1 ? "" : "s"}
        </p>
      </div>

      {answers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No Practice FRQ answers yet.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {answers.map((answer) => (
            <AnswerCard key={answer.id} answer={answer} learnerId={learnerId} />
          ))}
        </div>
      )}
    </div>
  );
}
