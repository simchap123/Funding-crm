"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Plus, FileSignature, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DocumentStatusBadge } from "@/components/documents/document-status-badge";
import type { DocumentStatus } from "@/lib/db/schema/documents";

type DocItem = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  recipients: { id: string; name: string; status: string }[];
};

export function ContactDocumentsSection({
  contactId,
  documents,
}: {
  contactId: string;
  documents: DocItem[];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileSignature className="h-5 w-5" />
          Documents ({documents.length})
        </CardTitle>
        <Link href={`/documents/new?contactId=${contactId}`}>
          <Button size="sm" variant="outline">
            <Plus className="mr-1 h-4 w-4" />
            New Document
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No documents yet for this contact
          </p>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => {
              const signedCount = doc.recipients.filter(
                (r) => r.status === "signed"
              ).length;
              const totalSigners = doc.recipients.length;

              return (
                <Link
                  key={doc.id}
                  href={`/documents/${doc.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {doc.title}
                      </span>
                      <DocumentStatusBadge
                        status={doc.status as DocumentStatus}
                      />
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {totalSigners > 0 && (
                        <span>
                          {signedCount}/{totalSigners} signed
                        </span>
                      )}
                      <span>
                        {format(new Date(doc.createdAt), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
