import { PageHeader } from "@/components/shared/page-header";
import { NewDocumentForm } from "@/components/documents/new-document-form";
import { db } from "@/lib/db";
import { contacts, loans } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

interface NewDocumentPageProps {
  searchParams: Promise<{ contactId?: string; loanId?: string }>;
}

export default async function NewDocumentPage({
  searchParams,
}: NewDocumentPageProps) {
  const params = await searchParams;

  const [allContacts, allLoans] = await Promise.all([
    db.query.contacts.findMany({
      orderBy: [desc(contacts.createdAt)],
    }),
    db.query.loans.findMany({
      with: { contact: true },
      orderBy: [desc(loans.createdAt)],
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Document"
        description="Create a document for signing"
      />
      <NewDocumentForm
        contacts={allContacts}
        loans={allLoans as any}
        defaultContactId={params.contactId}
        defaultLoanId={params.loanId}
        lockContact={!!params.contactId}
      />
    </div>
  );
}
