import { PageHeader } from "@/components/shared/page-header";
import { KanbanBoard } from "@/components/pipeline/kanban-board";
import { WorkspaceToggle } from "@/components/pipeline/workspace-toggle";
import { CalendarView } from "@/components/calendar/calendar-view";
import { getContactsByStage } from "@/lib/db/queries/contacts";
import { getFollowUpsByDateRange } from "@/lib/db/queries/follow-ups";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
  format,
} from "date-fns";

interface PipelinePageProps {
  searchParams: Promise<{
    view?: string;
    month?: string;
    year?: string;
  }>;
}

export default async function PipelinePage({
  searchParams,
}: PipelinePageProps) {
  const params = await searchParams;
  const view = params.view || "pipeline";

  if (view === "calendar") {
    const now = new Date();
    const year = params.year ? parseInt(params.year) : now.getFullYear();
    const month = params.month ? parseInt(params.month) - 1 : now.getMonth();
    const currentDate = new Date(year, month, 1);

    const rangeStart = format(
      startOfMonth(subMonths(currentDate, 1)),
      "yyyy-MM-dd"
    );
    const rangeEnd = format(
      endOfMonth(addMonths(currentDate, 1)),
      "yyyy-MM-dd"
    );

    const [followUps, allContacts] = await Promise.all([
      getFollowUpsByDateRange(rangeStart, rangeEnd),
      db.query.contacts.findMany({
        orderBy: [desc(contacts.createdAt)],
      }),
    ]);

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <PageHeader
            title="Workspace"
            description="Schedule and track follow-ups with prospects"
          />
          <WorkspaceToggle />
        </div>
        <CalendarView
          followUps={followUps as any}
          contacts={allContacts}
          currentYear={year}
          currentMonth={month}
          basePath="/pipeline?view=calendar"
        />
      </div>
    );
  }

  const data = await getContactsByStage();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <PageHeader
          title="Workspace"
          description="Drag and drop contacts between stages"
        />
        <WorkspaceToggle />
      </div>
      <KanbanBoard initialData={data} />
    </div>
  );
}
