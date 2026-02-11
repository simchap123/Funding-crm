import { formatDistanceToNow } from "date-fns";
import {
  UserPlus,
  Mail,
  Phone,
  ArrowRightLeft,
  StickyNote,
  Tag,
  Pencil,
  CheckCircle,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Activity } from "@/lib/types";
import type { ActivityType } from "@/lib/db/schema/activities";

const ACTIVITY_ICONS: Record<ActivityType, LucideIcon> = {
  contact_created: UserPlus,
  contact_updated: Pencil,
  email_sent: Mail,
  email_received: Mail,
  call_made: Phone,
  call_received: Phone,
  stage_changed: ArrowRightLeft,
  note_added: StickyNote,
  tag_added: Tag,
  tag_removed: Tag,
  score_changed: CheckCircle,
  task_completed: CheckCircle,
};

interface ActivityTimelineProps {
  activities: Activity[];
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = ACTIVITY_ICONS[activity.type as ActivityType] || CheckCircle;
            return (
              <div key={activity.id} className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 space-y-0.5">
                  <p className="text-sm">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            );
          })}
          {activities.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No activity yet
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
