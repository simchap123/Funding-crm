import { PageHeader } from "@/components/shared/page-header";
import { LoanForm } from "@/components/loans/loan-form";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

interface NewLoanPageProps {
  searchParams: Promise<{ contactId?: string }>;
}

export default async function NewLoanPage({ searchParams }: NewLoanPageProps) {
  const params = await searchParams;
  const allContacts = await db.query.contacts.findMany({
    orderBy: [desc(contacts.createdAt)],
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Loan"
        description="Create a new loan application"
      />
      <LoanForm
        contacts={allContacts}
        defaultContactId={params.contactId}
        lockContact={!!params.contactId}
      />
    </div>
  );
}
