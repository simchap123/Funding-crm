"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Kanban, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function WorkspaceToggle() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") || "pipeline";

  const setView = (newView: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", newView);
    router.push(`/pipeline?${params.toString()}`);
  };

  return (
    <div className="inline-flex items-center rounded-lg border bg-muted p-1">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 px-3 text-sm",
          view === "pipeline" && "bg-background shadow-sm"
        )}
        onClick={() => setView("pipeline")}
      >
        <Kanban className="mr-2 h-4 w-4" />
        Pipeline
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 px-3 text-sm",
          view === "calendar" && "bg-background shadow-sm"
        )}
        onClick={() => setView("calendar")}
      >
        <CalendarDays className="mr-2 h-4 w-4" />
        Calendar
      </Button>
    </div>
  );
}
