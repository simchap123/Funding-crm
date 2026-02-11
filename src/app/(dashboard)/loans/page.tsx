import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { LoansTableClient } from "@/components/loans/loans-table-client";
import { getLoans } from "@/lib/db/queries/loans";
import type { LoanStage } from "@/lib/db/schema/loans";

interface LoansPageProps {
  searchParams: Promise<{
    q?: string;
    stage?: string;
    page?: string;
  }>;
}

export default async function LoansPage({ searchParams }: LoansPageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;

  const result = await getLoans({
    search: params.q,
    stage: params.stage as LoanStage | undefined,
    page,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Loans" description="Track and manage loan applications">
        <Link href="/loans/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Loan
          </Button>
        </Link>
      </PageHeader>

      <LoansTableClient
        data={result.loans as any}
        total={result.total}
        pageCount={result.totalPages}
        page={page}
      />
    </div>
  );
}
