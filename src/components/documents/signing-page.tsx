"use client";

import { useState, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FieldInputDialog } from "./field-input-dialog";
import { signField, markDocumentViewed } from "@/lib/actions/documents";
import type { FieldPlacement } from "./pdf-viewer";

const PdfViewer = dynamic(
  () => import("./pdf-viewer").then((mod) => ({ default: mod.PdfViewer })),
  { ssr: false }
);

type Field = {
  id: string;
  type: string;
  label: string | null;
  required: boolean;
  page: number;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  value: string | null;
  filledAt: string | null;
};

type AttachmentData = {
  id: string;
  fileName: string;
  fileData: string | null;
  mimeType: string | null;
  fields: Field[];
};

type RecipientData = {
  id: string;
  name: string;
  email: string;
  accessToken: string;
  status: string;
  document: {
    id: string;
    title: string;
    description: string | null;
    message: string | null;
    status: string;
    attachments?: AttachmentData[];
  };
  fields: Field[];
};

export function SigningPage({ data }: { data: RecipientData }) {
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const f of data.fields) {
      if (f.value) initial[f.id] = f.value;
    }
    return initial;
  });
  const [signingField, setSigningField] = useState<FieldPlacement | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    markDocumentViewed(data.accessToken);
  }, [data.accessToken]);

  const allSigned = data.status === "signed";
  const docCompleted = data.document.status === "completed";

  // Find the first PDF attachment
  const pdfAttachment = data.document.attachments?.find(
    (a) => a.mimeType === "application/pdf" && a.fileData
  );

  // Build fields for the PDF viewer
  const pdfFields: FieldPlacement[] = data.fields.map((f) => ({
    id: f.id,
    type: f.type as FieldPlacement["type"],
    page: f.page,
    xPercent: f.xPercent,
    yPercent: f.yPercent,
    widthPercent: f.widthPercent,
    heightPercent: f.heightPercent,
    label: f.label || undefined,
    value: fieldValues[f.id] || f.value,
    filledAt: f.filledAt,
  }));

  const pendingFields = data.fields.filter(
    (f) => f.required && !f.filledAt && !fieldValues[f.id]
  );

  const handleFieldClick = (field: FieldPlacement) => {
    if (field.filledAt || fieldValues[field.id || ""]) return;
    setSigningField(field);
  };

  const handleFieldSubmit = async (fieldId: string, value: string) => {
    setSubmitting(true);
    try {
      const result = await signField(fieldId, value, data.accessToken);
      if ("error" in result && result.error) {
        toast.error(result.error as string);
        return;
      }
      setFieldValues((prev) => ({ ...prev, [fieldId]: value }));
      toast.success("Field completed");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignAll = async () => {
    setSubmitting(true);
    try {
      for (const field of data.fields) {
        if (field.filledAt || fieldValues[field.id]) continue;

        let value = "";
        if (field.type === "date") {
          value = new Date().toISOString().split("T")[0];
        } else if (field.type === "name") {
          value = data.name;
        } else if (field.type === "email") {
          value = data.email;
        }

        if (value) {
          await handleFieldSubmit(field.id, value);
        }
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (allSigned || docCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12">
            <CheckCircle2 className="h-16 w-16 text-green-600 mb-4" />
            <h2 className="text-xl font-semibold">
              {docCompleted ? "Document Completed" : "Already Signed"}
            </h2>
            <p className="text-sm text-muted-foreground mt-2 text-center">
              {docCompleted
                ? "All parties have signed this document."
                : "You have already completed your signature for this document."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle>{data.document.title}</CardTitle>
            {data.document.message && (
              <p className="text-sm text-muted-foreground">
                {data.document.message}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              <span className="text-muted-foreground">Signing as: </span>
              <span className="font-medium">
                {data.name} ({data.email})
              </span>
            </p>
            {pendingFields.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Click on the highlighted fields in the document to fill them in.
                {pendingFields.length} field{pendingFields.length !== 1 ? "s" : ""} remaining.
              </p>
            )}
          </CardContent>
        </Card>

        {/* PDF with interactive fields */}
        {pdfAttachment ? (
          <Card>
            <CardContent className="pt-6">
              <Suspense fallback={<Skeleton className="h-[600px] w-full rounded-lg" />}>
                <PdfViewer
                  fileData={pdfAttachment.fileData!}
                  fields={pdfFields}
                  mode="sign"
                  onFieldClick={handleFieldClick}
                />
              </Suspense>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                No PDF document attached. Please contact the sender.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Auto-fill and submit */}
        {pendingFields.length > 0 && (
          <div className="flex gap-3">
            <Button
              size="lg"
              className="flex-1"
              disabled={submitting}
              onClick={handleSignAll}
            >
              {submitting ? "Signing..." : "Auto-fill & Complete"}
            </Button>
          </div>
        )}
      </div>

      {/* Field input dialog */}
      <FieldInputDialog
        open={!!signingField}
        onOpenChange={(open) => !open && setSigningField(null)}
        field={signingField}
        signerName={data.name}
        signerEmail={data.email}
        onSubmit={handleFieldSubmit}
      />
    </div>
  );
}
