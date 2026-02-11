import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { LoanDetailCard } from "@/components/loans/loan-detail-card";
import { LoanConditions } from "@/components/loans/loan-conditions";
import { LoanActivityTimeline } from "@/components/loans/loan-activity-timeline";
import { LoanStageSelector } from "@/components/loans/loan-stage-selector";
import { ContactDocumentsSection } from "@/components/contacts/contact-documents-section";
import { getLoanById } from "@/lib/db/queries/loans";
import { LOAN_TYPE_LABELS } from "@/lib/constants";
import type { LoanType } from "@/lib/db/schema/loans";

interface LoanDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function LoanDetailPage({ params }: LoanDetailPageProps) {
  const { id } = await params;
  const loan = await getLoanById(id);

  if (!loan) return notFound();

  const loanDocs = (loan.documents || []).map((d: any) => ({
    id: d.id,
    title: d.title,
    status: d.status,
    createdAt: d.createdAt,
    recipients: (d.recipients || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      status: r.status,
    })),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${loan.contact.firstName} ${loan.contact.lastName} — ${LOAN_TYPE_LABELS[loan.loanType as LoanType]}`}
        description={
          loan.loanNumber
            ? `Loan #${loan.loanNumber}`
            : `Created ${new Date(loan.createdAt).toLocaleDateString()}`
        }
      >
        <div className="flex gap-2">
          <Link href={`/documents/new?loanId=${loan.id}&contactId=${loan.contactId}`}>
            <Button variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New Document
            </Button>
          </Link>
          <Link href="/loans">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Loans
            </Button>
          </Link>
        </div>
      </PageHeader>

      {/* Stage selector */}
      <LoanStageSelector loanId={loan.id} currentStage={loan.stage as any} />

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <LoanDetailCard loan={loan as any} />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <ContactDocumentsSection
            contactId={loan.contactId}
            documents={loanDocs}
          />
          <LoanConditions
            loanId={loan.id}
            conditions={loan.conditions as any}
          />
          <LoanActivityTimeline activities={loan.loanActivities as any} />
        </div>
      </div>
    </div>
  );
}
