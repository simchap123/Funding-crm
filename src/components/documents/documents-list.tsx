"use client";

import { format } from "date-fns";
import Link from "next/link";
import { FileText, MoreHorizontal, Send, Eye, Trash2, Ban } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DocumentStatusBadge } from "./document-status-badge";
import { deleteDocument, voidDocument } from "@/lib/actions/documents";
import type { DocumentStatus } from "@/lib/db/schema/documents";

type DocItem = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  sentAt: string | null;
  completedAt: string | null;
  recipients: { id: string; name: string; email: string; status: string }[];
  contact: { firstName: string; lastName: string } | null;
};

export function DocumentsList({ documents }: { documents: DocItem[] }) {
  const handleDelete = async (id: string) => {
    const result = await deleteDocument(id);
    if (result.success) toast.success("Document deleted");
  };

  const handleVoid = async (id: string) => {
    const result = await voidDocument(id);
    if (result.success) toast.success("Document voided");
  };

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No documents yet</p>
          <p className="text-sm text-muted-foreground">
            Create your first document to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <Card key={doc.id} className="hover:bg-muted/50 transition-colors">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              <Link
                href={`/documents/${doc.id}`}
                className="font-medium hover:underline"
              >
                {doc.title}
              </Link>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  {doc.recipients.length} recipient
                  {doc.recipients.length !== 1 ? "s" : ""}
                </span>
                {doc.contact && (
                  <span className="text-xs text-muted-foreground">
                    {doc.contact.firstName} {doc.contact.lastName}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {format(new Date(doc.createdAt), "MMM d, yyyy")}
                </span>
              </div>
            </div>

            <DocumentStatusBadge status={doc.status as DocumentStatus} />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/documents/${doc.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </Link>
                </DropdownMenuItem>
                {doc.status !== "voided" && doc.status !== "completed" && (
                  <DropdownMenuItem onClick={() => handleVoid(doc.id)}>
                    <Ban className="mr-2 h-4 w-4" />
                    Void
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => handleDelete(doc.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
