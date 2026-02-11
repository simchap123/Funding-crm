import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { DocumentsList } from "@/components/documents/documents-list";
import { getDocuments } from "@/lib/db/queries/documents";

export default async function DocumentsPage() {
  const result = await getDocuments();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Send, sign, and track documents"
      >
        <Link href="/documents/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Document
          </Button>
        </Link>
      </PageHeader>

      <DocumentsList documents={result.documents as any} />
    </div>
  );
}
