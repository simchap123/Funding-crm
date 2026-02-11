import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STAGE_CONFIG } from "@/lib/constants";
import { LEAD_STAGES } from "@/lib/db/schema/contacts";
import { cn } from "@/lib/utils";

interface PipelineSummaryProps {
  stageCounts: Record<string, number>;
}

export function PipelineSummary({ stageCounts }: PipelineSummaryProps) {
  const total = Object.values(stageCounts).reduce((a, b) => a + b, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {LEAD_STAGES.map((stage) => {
          const config = STAGE_CONFIG[stage];
          const count = stageCounts[stage] || 0;
          const percent = total > 0 ? (count / total) * 100 : 0;

          return (
            <div key={stage} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className={cn("font-medium", config.color)}>
                  {config.label}
                </span>
                <span className="text-muted-foreground">{count}</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className={cn("h-2 rounded-full", config.bgColor)}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
