"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Phone,
  Mail,
  Users,
  ClipboardList,
  Bell,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FollowUpDialog } from "./follow-up-dialog";
import {
  completeFollowUp,
  rescheduleFollowUp,
} from "@/lib/actions/follow-ups";

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
  contactId: string | null;
  loanId: string | null;
  contact: { firstName: string; lastName: string } | null;
};

const TYPE_ICONS: Record<string, any> = {
  call: Phone,
  email: Mail,
  meeting: Users,
  task: ClipboardList,
  reminder: Bell,
};

const TYPE_COLORS: Record<string, string> = {
  call: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  email: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  meeting: "bg-green-500/10 text-green-600 border-green-500/20",
  task: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  reminder: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
};

export function CalendarView({
  followUps,
  contacts,
  currentYear,
  currentMonth,
  basePath = "/calendar",
}: {
  followUps: FollowUp[];
  contacts: Contact[];
  currentYear: number;
  currentMonth: number;
  basePath?: string;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const currentDate = new Date(currentYear, currentMonth, 1);
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const navigateMonth = (direction: "prev" | "next") => {
    const target =
      direction === "prev"
        ? subMonths(currentDate, 1)
        : addMonths(currentDate, 1);
    router.push(
      `${basePath}${basePath.includes("?") ? "&" : "?"}year=${target.getFullYear()}&month=${target.getMonth() + 1}`
    );
  };

  const goToToday = () => {
    const now = new Date();
    router.push(
      `${basePath}${basePath.includes("?") ? "&" : "?"}year=${now.getFullYear()}&month=${now.getMonth() + 1}`
    );
  };

  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    setDialogOpen(true);
  };

  const handleDragStart = (e: React.DragEvent, followUpId: string) => {
    setDraggedId(followUpId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    if (!draggedId) return;

    const result = await rescheduleFollowUp(draggedId, dateStr);
    if (result.success) {
      toast.success("Follow-up rescheduled");
    }
    setDraggedId(null);
  };

  const handleComplete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const result = await completeFollowUp(id);
    if (result.success) {
      toast.success("Follow-up completed");
    }
  };

  // Build days array
  const days: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  // Group follow-ups by date
  const followUpsByDate: Record<string, FollowUp[]> = {};
  for (const fu of followUps) {
    if (!followUpsByDate[fu.dueDate]) followUpsByDate[fu.dueDate] = [];
    followUpsByDate[fu.dueDate].push(fu);
  }

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <>
      <Card>
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateMonth("prev")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold min-w-[180px] text-center">
              {format(currentDate, "MMMM yyyy")}
            </h2>
            <Button variant="outline" size="icon" onClick={() => navigateMonth("next")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={goToToday}>
              Today
            </Button>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setSelectedDate(format(new Date(), "yyyy-MM-dd"));
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            New Follow-up
          </Button>
        </div>

        <CardContent className="p-0">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b">
            {weekDays.map((d) => (
              <div
                key={d}
                className="py-2 text-center text-xs font-medium text-muted-foreground"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {days.map((d, i) => {
              const dateStr = format(d, "yyyy-MM-dd");
              const dayFollowUps = followUpsByDate[dateStr] || [];
              const isCurrentMonth = isSameMonth(d, currentDate);
              const isCurrentDay = isToday(d);

              return (
                <div
                  key={i}
                  className={cn(
                    "min-h-[100px] md:min-h-[120px] border-b border-r p-1 cursor-pointer transition-colors hover:bg-muted/30",
                    !isCurrentMonth && "bg-muted/10 text-muted-foreground",
                    i % 7 === 0 && "border-l"
                  )}
                  onClick={() => handleDayClick(dateStr)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, dateStr)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={cn(
                        "text-xs font-medium h-6 w-6 flex items-center justify-center rounded-full",
                        isCurrentDay && "bg-primary text-primary-foreground"
                      )}
                    >
                      {format(d, "d")}
                    </span>
                    {dayFollowUps.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        {dayFollowUps.length}
                      </span>
                    )}
                  </div>
                  <div className="space-y-0.5 overflow-hidden">
                    {dayFollowUps.slice(0, 3).map((fu) => {
                      const Icon = TYPE_ICONS[fu.type] || Bell;
                      const isCompleted = fu.status === "completed";
                      return (
                        <div
                          key={fu.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, fu.id)}
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            "flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] leading-tight border cursor-grab active:cursor-grabbing",
                            isCompleted
                              ? "bg-muted/50 text-muted-foreground line-through"
                              : TYPE_COLORS[fu.type] || TYPE_COLORS.reminder
                          )}
                        >
                          <button
                            onClick={(e) => handleComplete(fu.id, e)}
                            className="shrink-0"
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <Circle className="h-3 w-3" />
                            )}
                          </button>
                          <span className="truncate">{fu.title}</span>
                        </div>
                      );
                    })}
                    {dayFollowUps.length > 3 && (
                      <span className="text-[10px] text-muted-foreground pl-1">
                        +{dayFollowUps.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <FollowUpDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultDate={selectedDate || format(new Date(), "yyyy-MM-dd")}
        contacts={contacts}
      />
    </>
  );
}
