import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ActivityFeedProps {
  activities: {
    id: string;
    type: string;
    description: string;
    createdAt: string;
    contact: { id: string; firstName: string; lastName: string } | null;
  }[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 text-sm">
              <div className="h-2 w-2 mt-1.5 rounded-full bg-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p>
                  {activity.contact ? (
                    <Link
                      href={`/contacts/${activity.contact.id}`}
                      className="font-medium hover:underline"
                    >
                      {activity.contact.firstName} {activity.contact.lastName}
                    </Link>
                  ) : (
                    <span className="font-medium">Unknown</span>
                  )}
                  {" - "}
                  {activity.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(activity.createdAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </div>
          ))}
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
