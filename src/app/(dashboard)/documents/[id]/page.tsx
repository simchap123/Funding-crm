import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { DocumentDetail } from "@/components/documents/document-detail";
import { getDocumentById } from "@/lib/db/queries/documents";

interface DocumentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function DocumentDetailPage({
  params,
}: DocumentDetailPageProps) {
  const { id } = await params;
  const doc = await getDocumentById(id);

  if (!doc) return notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={doc.title} description="Document details">
        <Link href="/documents">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Documents
          </Button>
        </Link>
      </PageHeader>

      <DocumentDetail document={doc as any} />
    </div>
  );
}
