import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface MisconceptionEntry {
  code: string;
  label: string;
  scope: "content" | "practice";
  evidenceCount: number;
  lastObservedAt: string;
}

export function MisconceptionList({
  misconceptions,
}: {
  misconceptions: MisconceptionEntry[];
}) {
  if (misconceptions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No recurring misconceptions detected yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {misconceptions.map((m) => (
        <Card key={m.code}>
          <CardContent className="flex flex-col gap-1 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{m.label}</p>
              <Badge variant={m.scope === "practice" ? "secondary" : "outline"}>
                {m.scope === "practice" ? "Reasoning pattern" : "Content"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Seen {m.evidenceCount} {m.evidenceCount === 1 ? "time" : "times"} -- last on{" "}
              {new Date(m.lastObservedAt).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
