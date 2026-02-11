"use client";

import { useState, useOptimistic, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { LEAD_STAGES, type LeadStage } from "@/lib/db/schema/contacts";
import { moveContactToStage } from "@/lib/actions/pipeline";
import { KanbanColumn } from "./kanban-column";
import { KanbanCard } from "./kanban-card";
import type { ContactWithTags } from "@/lib/types";

interface KanbanBoardProps {
  initialData: Record<LeadStage, ContactWithTags[]>;
}

export function KanbanBoard({ initialData }: KanbanBoardProps) {
  const [data, setData] = useState(initialData);
  const [activeContact, setActiveContact] = useState<ContactWithTags | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      for (const stage of LEAD_STAGES) {
        const contact = data[stage].find((c) => c.id === active.id);
        if (contact) {
          setActiveContact(contact);
          break;
        }
      }
    },
    [data]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveContact(null);

      if (!over) return;

      const contactId = active.id as string;
      let targetStage = over.id as string;

      // If dropped over another card, find which column it belongs to
      if (!LEAD_STAGES.includes(targetStage as LeadStage)) {
        for (const stage of LEAD_STAGES) {
          if (data[stage].find((c) => c.id === targetStage)) {
            targetStage = stage;
            break;
          }
        }
      }

      if (!LEAD_STAGES.includes(targetStage as LeadStage)) return;

      // Find current stage
      let currentStage: LeadStage | null = null;
      for (const stage of LEAD_STAGES) {
        if (data[stage].find((c) => c.id === contactId)) {
          currentStage = stage;
          break;
        }
      }

      if (!currentStage || currentStage === targetStage) return;

      // Optimistic update
      const contact = data[currentStage].find((c) => c.id === contactId);
      if (!contact) return;

      setData((prev) => {
        const next = { ...prev };
        next[currentStage] = prev[currentStage].filter(
          (c) => c.id !== contactId
        );
        next[targetStage as LeadStage] = [
          ...prev[targetStage as LeadStage],
          { ...contact, stage: targetStage as LeadStage },
        ];
        return next;
      });

      const result = await moveContactToStage(
        contactId,
        targetStage as LeadStage
      );
      if (result.error) {
        // Revert
        setData(initialData);
        toast.error(result.error as string);
      } else {
        toast.success(`Moved to ${targetStage}`);
      }
    },
    [data, initialData]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {LEAD_STAGES.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            contacts={data[stage]}
          />
        ))}
      </div>
      <DragOverlay>
        {activeContact ? <KanbanCard contact={activeContact} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
