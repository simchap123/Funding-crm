"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  type RowSelectionState,
} from "@tanstack/react-table";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/data-table/data-table";
import { DataTablePagination } from "@/components/shared/data-table/data-table-pagination";
import { ContactsToolbar } from "./contacts-toolbar";
import { getColumns } from "./contacts-columns";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteContact, deleteContacts } from "@/lib/actions/contacts";
import type { ContactWithTags, Tag } from "@/lib/types";

interface ContactsTableClientProps {
  data: ContactWithTags[];
  tags: Tag[];
  total: number;
  pageCount: number;
  page: number;
}

export function ContactsTableClient({
  data,
  tags,
  total,
  pageCount,
  page,
}: ContactsTableClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const columns = useMemo(() => getColumns({ onDelete: setDeleteId }), []);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setRowSelection,
    state: { rowSelection },
  });

  const selectedIds = table
    .getSelectedRowModel()
    .rows.map((r) => r.original.id);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const result = await deleteContact(deleteId);
    if (result.success) {
      toast.success("Contact deleted");
      setDeleteId(null);
    }
  };

  const handleBulkDelete = async () => {
    const result = await deleteContacts(selectedIds);
    if (result.success) {
      toast.success(`${selectedIds.length} contacts deleted`);
      setBulkDeleteOpen(false);
      setRowSelection({});
    }
  };

  return (
    <div className="space-y-4">
      <ContactsToolbar
        tags={tags}
        selectedCount={selectedIds.length}
        onBulkDelete={() => setBulkDeleteOpen(true)}
      />
      <DataTable table={table} columns={columns} />
      <DataTablePagination
        page={page}
        pageCount={pageCount}
        total={total}
        onPageChange={handlePageChange}
        selectedCount={selectedIds.length}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete contact"
        description="Are you sure you want to delete this contact? This action cannot be undone."
        onConfirm={handleDelete}
        confirmLabel="Delete"
        destructive
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="Delete contacts"
        description={`Are you sure you want to delete ${selectedIds.length} contacts? This action cannot be undone.`}
        onConfirm={handleBulkDelete}
        confirmLabel="Delete all"
        destructive
      />
    </div>
  );
}
