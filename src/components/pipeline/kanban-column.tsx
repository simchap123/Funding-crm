"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { STAGE_CONFIG } from "@/lib/constants";
import { KanbanCard } from "./kanban-card";
import type { ContactWithTags } from "@/lib/types";
import type { LeadStage } from "@/lib/db/schema/contacts";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  stage: LeadStage;
  contacts: ContactWithTags[];
}

export function KanbanColumn({ stage, contacts }: KanbanColumnProps) {
  const config = STAGE_CONFIG[stage];
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      className={cn(
        "flex w-[280px] shrink-0 flex-col rounded-lg border bg-muted/30",
        isOver && "ring-2 ring-primary"
      )}
    >
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <span className={cn("font-medium text-sm", config.color)}>
            {config.label}
          </span>
          <Badge variant="secondary" className="text-xs">
            {contacts.length}
          </Badge>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div ref={setNodeRef} className="p-2 space-y-2 min-h-[200px]">
          <SortableContext
            items={contacts.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {contacts.map((contact) => (
              <KanbanCard key={contact.id} contact={contact} />
            ))}
          </SortableContext>
        </div>
      </ScrollArea>
    </div>
  );
}
