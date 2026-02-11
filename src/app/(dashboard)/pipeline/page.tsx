import { PageHeader } from "@/components/shared/page-header";
import { KanbanBoard } from "@/components/pipeline/kanban-board";
import { getContactsByStage } from "@/lib/db/queries/contacts";

export default async function PipelinePage() {
  const data = await getContactsByStage();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pipeline"
        description="Drag and drop contacts between stages"
      />
      <KanbanBoard initialData={data} />
    </div>
  );
}
