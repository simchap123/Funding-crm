import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  FileText,
  MessageSquare,
  Lock,
  Home,
  DollarSign,
  Calendar,
  CheckCircle2,
  Plus,
} from "lucide-react";
import type { LoanActivity } from "@/lib/types";

const ACTIVITY_ICONS: Record<string, any> = {
  stage_changed: ArrowRight,
  document_requested: FileText,
  document_received: FileText,
  document_sent: FileText,
  note_added: MessageSquare,
  rate_locked: Lock,
  appraisal_ordered: Home,
  appraisal_received: Home,
  closing_scheduled: Calendar,
  funded: DollarSign,
  condition_added: Plus,
  condition_cleared: CheckCircle2,
};

export function LoanActivityTimeline({
  activities,
}: {
  activities: LoanActivity[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No activity yet
          </p>
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-4">
              {activities.map((activity) => {
                const Icon =
                  ACTIVITY_ICONS[activity.type] || ArrowRight;
                return (
                  <div key={activity.id} className="relative flex gap-4 pl-2">
                    <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border bg-background">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm">{activity.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(
                          new Date(activity.createdAt),
                          "MMM d, yyyy 'at' h:mm a"
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
