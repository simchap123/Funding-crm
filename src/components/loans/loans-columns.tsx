"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import Link from "next/link";
import { MoreHorizontal, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LoanStageBadge } from "./loan-stage-badge";
import { LOAN_TYPE_LABELS } from "@/lib/constants";
import type { LoanWithContact } from "@/lib/types";
import type { LoanType } from "@/lib/db/schema/loans";

function formatCurrency(value: number | null) {
  if (value == null) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export const loansColumns: ColumnDef<LoanWithContact>[] = [
  {
    accessorKey: "contact",
    header: "Borrower",
    cell: ({ row }) => {
      const contact = row.original.contact;
      return (
        <Link
          href={`/loans/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {contact.firstName} {contact.lastName}
        </Link>
      );
    },
  },
  {
    accessorKey: "loanType",
    header: "Type",
    cell: ({ row }) =>
      LOAN_TYPE_LABELS[row.original.loanType as LoanType] ||
      row.original.loanType,
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => formatCurrency(row.original.amount),
  },
  {
    accessorKey: "interestRate",
    header: "Rate",
    cell: ({ row }) =>
      row.original.interestRate != null
        ? `${row.original.interestRate}%`
        : "-",
  },
  {
    accessorKey: "stage",
    header: "Stage",
    cell: ({ row }) => (
      <LoanStageBadge stage={row.original.stage as any} />
    ),
  },
  {
    accessorKey: "lender",
    header: "Lender",
    cell: ({ row }) => row.original.lender || "-",
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => format(new Date(row.original.createdAt), "MMM d, yyyy"),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/loans/${row.original.id}`}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];
