import { Card, CardContent } from "@/components/ui/card";

interface InsightEntry {
  id: string;
  summaryText: string;
  createdAt: string;
}

export function InsightList({ insights }: { insights: InsightEntry[] }) {
  if (insights.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No insights yet -- these build up as you finish study sessions.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {insights.map((insight) => (
        <Card key={insight.id}>
          <CardContent className="flex flex-col gap-1 py-3">
            <p className="text-sm">{insight.summaryText}</p>
            <p className="text-xs text-muted-foreground">
              Noticed on {new Date(insight.createdAt).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
