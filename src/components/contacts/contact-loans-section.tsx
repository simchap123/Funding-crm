"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Plus, Landmark, ArrowRight, FileSignature } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoanStageBadge } from "@/components/loans/loan-stage-badge";
import { DocumentStatusBadge } from "@/components/documents/document-status-badge";
import { LOAN_TYPE_LABELS } from "@/lib/constants";
import type { DocumentStatus } from "@/lib/db/schema/documents";
import type { LoanType, LoanStage } from "@/lib/db/schema/loans";

type DocSummary = {
  id: string;
  title: string;
  status: string;
  recipients: { id: string; status: string }[];
};

type LoanWithDocs = {
  id: string;
  loanType: string;
  stage: string;
  amount: number | null;
  interestRate: number | null;
  lender: string | null;
  createdAt: string;
  documents?: DocSummary[];
};

function formatCurrency(value: number | null) {
  if (value == null) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function ContactLoansSection({
  contactId,
  loans,
}: {
  contactId: string;
  loans: LoanWithDocs[];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Landmark className="h-5 w-5" />
          Loans ({loans.length})
        </CardTitle>
        <Link href={`/loans/new?contactId=${contactId}`}>
          <Button size="sm" variant="outline">
            <Plus className="mr-1 h-4 w-4" />
            New Loan
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {loans.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No loans yet for this contact
          </p>
        ) : (
          <div className="space-y-3">
            {loans.map((loan) => {
              const docs = loan.documents || [];
              return (
                <div
                  key={loan.id}
                  className="rounded-lg border overflow-hidden"
                >
                  <Link
                    href={`/loans/${loan.id}`}
                    className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {LOAN_TYPE_LABELS[loan.loanType as LoanType]}
                        </span>
                        <LoanStageBadge stage={loan.stage as LoanStage} />
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{formatCurrency(loan.amount)}</span>
                        {loan.interestRate && (
                          <span>{loan.interestRate}%</span>
                        )}
                        {loan.lender && <span>{loan.lender}</span>}
                        <span>
                          {format(new Date(loan.createdAt), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                  </Link>
                  {docs.length > 0 && (
                    <div className="border-t bg-muted/20 px-3 py-2 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <FileSignature className="h-3.5 w-3.5" />
                        Documents ({docs.length})
                      </div>
                      {docs.map((doc) => {
                        const signedCount = doc.recipients?.filter(
                          (r) => r.status === "signed"
                        ).length ?? 0;
                        const totalSigners = doc.recipients?.length ?? 0;
                        return (
                          <Link
                            key={doc.id}
                            href={`/documents/${doc.id}`}
                            className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted/50 transition-colors text-sm"
                          >
                            <span className="truncate mr-2">{doc.title}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              {totalSigners > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  {signedCount}/{totalSigners}
                                </span>
                              )}
                              <DocumentStatusBadge
                                status={doc.status as DocumentStatus}
                              />
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
