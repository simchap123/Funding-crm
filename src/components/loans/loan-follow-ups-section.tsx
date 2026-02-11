"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Plus,
  Phone,
  Mail,
  Users,
  ClipboardList,
  Bell,
  CheckCircle2,
  Circle,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FollowUpDialog } from "@/components/calendar/follow-up-dialog";
import { completeFollowUp } from "@/lib/actions/follow-ups";

type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  company: string | null;
};

type FollowUp = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  dueDate: string;
  dueTime: string | null;
};

const TYPE_ICONS: Record<string, any> = {
  call: Phone,
  email: Mail,
  meeting: Users,
  task: ClipboardList,
  reminder: Bell,
};

const TYPE_COLORS: Record<string, string> = {
  call: "text-blue-600",
  email: "text-purple-600",
  meeting: "text-green-600",
  task: "text-orange-600",
  reminder: "text-yellow-600",
};

export function LoanFollowUpsSection({
  contact,
  followUps,
}: {
  contact: Contact;
  followUps: FollowUp[];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleComplete = async (id: string) => {
    const result = await completeFollowUp(id);
    if (result.success) {
      toast.success("Follow-up completed");
    }
  };

  const scheduled = followUps.filter((f) => f.status === "scheduled");

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Follow-ups ({scheduled.length})
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="mr-1 h-4 w-4" />
            Remind Me
          </Button>
        </CardHeader>
        <CardContent>
          {followUps.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No follow-ups scheduled for this loan.
            </p>
          ) : (
            <div className="space-y-2">
              {scheduled.map((fu) => {
                const Icon = TYPE_ICONS[fu.type] || Bell;
                return (
                  <div
                    key={fu.id}
                    className="flex items-center gap-3 p-2 rounded-lg border"
                  >
                    <button onClick={() => handleComplete(fu.id)}>
                      <Circle className="h-4 w-4 text-muted-foreground hover:text-primary" />
                    </button>
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        TYPE_COLORS[fu.type] || "text-muted-foreground"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{fu.title}</p>
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0">
                      {format(new Date(fu.dueDate), "MMM d")}
                      {fu.dueTime && ` at ${fu.dueTime}`}
                    </div>
                    <Badge variant="outline" className="capitalize text-xs">
                      {fu.type}
                    </Badge>
                  </div>
                );
              })}
              {followUps
                .filter((f) => f.status === "completed")
                .slice(0, 3)
                .map((fu) => (
                  <div
                    key={fu.id}
                    className="flex items-center gap-3 p-2 text-muted-foreground"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span className="text-sm line-through truncate">
                      {fu.title}
                    </span>
                    <span className="text-xs shrink-0">
                      {format(new Date(fu.dueDate), "MMM d")}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      <FollowUpDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultDate={format(new Date(), "yyyy-MM-dd")}
        contacts={[contact]}
        defaultContactId={contact.id}
        lockContact
      />
    </>
  );
}
