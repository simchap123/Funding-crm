"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
} from "@tanstack/react-table";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/data-table/data-table";
import { DataTablePagination } from "@/components/shared/data-table/data-table-pagination";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteLoan } from "@/lib/actions/loans";
import { loansColumns } from "./loans-columns";
import type { LoanWithContact } from "@/lib/types";

interface LoansTableClientProps {
  data: LoanWithContact[];
  total: number;
  pageCount: number;
  page: number;
}

export function LoansTableClient({
  data,
  total,
  pageCount,
  page,
}: LoansTableClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const table = useReactTable({
    data,
    columns: loansColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const result = await deleteLoan(deleteId);
    if (result.success) {
      toast.success("Loan deleted");
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-4">
      <DataTable table={table} columns={loansColumns} />
      <DataTablePagination
        page={page}
        pageCount={pageCount}
        total={total}
        onPageChange={handlePageChange}
        selectedCount={0}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete loan"
        description="Are you sure you want to delete this loan? This action cannot be undone."
        onConfirm={handleDelete}
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}
