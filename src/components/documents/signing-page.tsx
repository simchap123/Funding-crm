"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
  Check,
  CircleDot,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FieldInputDialog } from "./field-input-dialog";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { signField, markDocumentViewed } from "@/lib/actions/documents";
import { requestVerificationCode, verifyCode } from "@/lib/actions/signing";
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
  contactCompany?: string | null;
  contactTitle?: string | null;
  document: {
    id: string;
    title: string;
    description: string | null;
    message: string | null;
    status: string;
    senderName?: string | null;
    attachments?: AttachmentData[];
  };
  fields: Field[];
};

// ---------- helpers ----------

function generateInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function formatReadableDate(date: Date = new Date()): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ---------- component ----------

export function SigningPage({ data }: { data: RecipientData }) {
  // Verification state
  const [verificationStep, setVerificationStep] = useState<
    "email" | "code" | "verified"
  >("email");
  const [emailInput, setEmailInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [codeSentTo, setCodeSentTo] = useState("");

  // Field values tracked locally (not submitted until "Complete Signing")
  const [localValues, setLocalValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const f of data.fields) {
      if (f.value) initial[f.id] = f.value;
    }
    return initial;
  });

  // Track which fields came pre-filled from the server (already submitted)
  const [serverFilledIds] = useState<Set<string>>(() => {
    const set = new Set<string>();
    for (const f of data.fields) {
      if (f.filledAt) set.add(f.id);
    }
    return set;
  });

  const [signingField, setSigningField] = useState<FieldPlacement | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);

  // Guided sequence state
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [showReview, setShowReview] = useState(false);

  // Company / title dialog
  const [showCompanyDialog, setShowCompanyDialog] = useState(false);
  const [companyInput, setCompanyInput] = useState(
    data.contactCompany || ""
  );
  const [titleInput, setTitleInput] = useState(data.contactTitle || "");
  const [companyFieldId, setCompanyFieldId] = useState<string | null>(null);
  const [titleFieldId, setTitleFieldId] = useState<string | null>(null);

  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    markDocumentViewed(data.accessToken);
  }, [data.accessToken]);

  const allSigned = data.status === "signed";
  const docCompleted = data.document.status === "completed";

  // Only show fields assigned to the current recipient (Issue #19)
  const myFieldIds = new Set(data.fields.map((f) => f.id));

  const pdfAttachment = data.document.attachments?.find(
    (a) => a.mimeType === "application/pdf" && a.fileData
  );

  // Only include this recipient's fields on the PDF
  const myFields: Field[] = data.fields;

  const pdfFields: FieldPlacement[] = myFields.map((f) => ({
    id: f.id,
    type: f.type as FieldPlacement["type"],
    page: f.page,
    xPercent: f.xPercent,
    yPercent: f.yPercent,
    widthPercent: f.widthPercent,
    heightPercent: f.heightPercent,
    label: f.label || undefined,
    value: localValues[f.id] || f.value,
    filledAt: serverFilledIds.has(f.id) ? f.filledAt : undefined,
    recipientId: data.id,
  }));

  // Unsigned fields (the ones the user still needs to fill)
  const unsignedFields = myFields.filter(
    (f) => !serverFilledIds.has(f.id) && !localValues[f.id]
  );

  const totalFields = myFields.filter((f) => !serverFilledIds.has(f.id)).length;
  const filledCount = totalFields - unsignedFields.length;
  const progressPercent =
    totalFields > 0 ? Math.round((filledCount / totalFields) * 100) : 100;

  // The current "guided" field
  const currentUnsigned = unsignedFields[currentFieldIndex] || null;
  const highlightFieldId = currentUnsigned?.id || null;

  // Scroll to highlighted field after filling one
  const scrollToField = useCallback((fieldId: string) => {
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      const el = document.querySelector(`[data-field-id="${fieldId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 300);
  }, []);

  // When the current field changes, scroll to it
  useEffect(() => {
    if (highlightFieldId) {
      scrollToField(highlightFieldId);
    }
  }, [highlightFieldId, scrollToField]);

  const handleFieldClick = (field: FieldPlacement) => {
    // Allow clicking on any of this recipient's unfilled fields
    if (!myFieldIds.has(field.id || "")) return;
    // Already submitted to server — don't allow re-edit
    if (serverFilledIds.has(field.id || "")) return;
    setSigningField(field);
  };

  // Store value locally (don't submit to server yet — Issue #18)
  const handleFieldFill = (fieldId: string, value: string) => {
    setLocalValues((prev) => ({ ...prev, [fieldId]: value }));
    // Move guided index to next unsigned field after this one fills
    // (the unsignedFields array will shrink on next render)
  };

  const handleClearField = (fieldId: string) => {
    setLocalValues((prev) => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  };

  // Auto-fill all remaining fields (Issue #1 — initials, Issue #5 — date)
  const handleAutoFill = () => {
    const updates: Record<string, string> = {};
    for (const field of myFields) {
      if (serverFilledIds.has(field.id) || localValues[field.id]) continue;
      let value = "";
      if (field.type === "date") {
        value = formatReadableDate();
      } else if (field.type === "name") {
        value = data.name;
      } else if (field.type === "email") {
        value = data.email;
      } else if (field.type === "initials") {
        value = generateInitials(data.name);
      } else if (field.type === "signature") {
        // Generate a typed signature image
        const canvas = document.createElement("canvas");
        canvas.width = 500;
        canvas.height = 150;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.font = "italic 48px 'Georgia', serif";
          ctx.fillStyle = "#1a1a2e";
          ctx.textBaseline = "middle";
          ctx.fillText(data.name, 20, 75);
          value = canvas.toDataURL();
        }
      }
      if (value) {
        updates[field.id] = value;
      }
    }
    setLocalValues((prev) => ({ ...prev, ...updates }));
    toast.success("Fields auto-filled. Review and click Complete Signing.");
  };

  // Final submission — send all locally-filled values to the server
  const handleCompleteSigning = async () => {
    setSubmitting(true);
    try {
      const fieldsToSubmit = myFields.filter(
        (f) => !serverFilledIds.has(f.id) && localValues[f.id]
      );
      for (const field of fieldsToSubmit) {
        const result = await signField(
          field.id,
          localValues[field.id],
          data.accessToken
        );
        if ("error" in result && result.error) {
          toast.error(result.error as string);
          setSubmitting(false);
          return;
        }
      }
      toast.success("Document signed successfully!");
      // Reload to show completed state
      window.location.reload();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  // Navigate guided sequence
  const goToNextField = () => {
    if (currentFieldIndex < unsignedFields.length - 1) {
      setCurrentFieldIndex((i) => i + 1);
    }
  };
  const goToPrevField = () => {
    if (currentFieldIndex > 0) {
      setCurrentFieldIndex((i) => i - 1);
    }
  };

  // Keep the index in bounds when fields get filled
  useEffect(() => {
    if (currentFieldIndex >= unsignedFields.length && unsignedFields.length > 0) {
      setCurrentFieldIndex(unsignedFields.length - 1);
    }
  }, [unsignedFields.length, currentFieldIndex]);

  // ---------- verification handlers ----------

  const handleEmailSubmit = async () => {
    setVerifying(true);
    setVerificationError("");
    try {
      const result = await requestVerificationCode(
        data.accessToken,
        emailInput
      );
      if ("error" in result && result.error) {
        setVerificationError(result.error as string);
      } else {
        if ("warning" in result && result.warning) {
          toast.warning(result.warning as string);
        }
        setCodeSentTo(result.email || emailInput);
        setVerificationStep("code");
      }
    } catch {
      setVerificationError("Something went wrong. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const handleCodeSubmit = async () => {
    setVerifying(true);
    setVerificationError("");
    try {
      const result = await verifyCode(data.accessToken, codeInput);
      if ("error" in result && result.error) {
        setVerificationError(result.error as string);
      } else {
        setVerificationStep("verified");
      }
    } catch {
      setVerificationError("Something went wrong. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const handleResendCode = async () => {
    setVerifying(true);
    setVerificationError("");
    try {
      const result = await requestVerificationCode(
        data.accessToken,
        emailInput
      );
      if ("error" in result && result.error) {
        setVerificationError(result.error as string);
      } else {
        if ("warning" in result && result.warning) {
          toast.warning(result.warning as string);
        } else {
          toast.success("New code sent!");
        }
      }
    } catch {
      setVerificationError("Failed to resend code.");
    } finally {
      setVerifying(false);
    }
  };

  // ---------- renders ----------

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

  // Verification: email
  if (verificationStep === "email") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>{data.document.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter your email address to verify your identity.
            </p>
            <Input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="your@email.com"
              onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
            />
            {verificationError && (
              <p className="text-sm text-destructive">{verificationError}</p>
            )}
            <Button
              className="w-full"
              onClick={handleEmailSubmit}
              disabled={verifying || !emailInput}
            >
              {verifying ? "Verifying..." : "Continue"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Verification: code
  if (verificationStep === "code") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Enter Verification Code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              We sent a 6-digit code to <strong>{codeSentTo}</strong>. Enter it
              below.
            </p>
            <Input
              value={codeInput}
              onChange={(e) =>
                setCodeInput(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="000000"
              className="text-center text-2xl tracking-widest"
              maxLength={6}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                codeInput.length === 6 &&
                handleCodeSubmit()
              }
            />
            {verificationError && (
              <p className="text-sm text-destructive">{verificationError}</p>
            )}
            <Button
              className="w-full"
              onClick={handleCodeSubmit}
              disabled={verifying || codeInput.length !== 6}
            >
              {verifying ? "Verifying..." : "Verify"}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={handleResendCode}
              disabled={verifying}
            >
              Resend Code
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------- Review & Complete dialog ----------

  const reviewDialog = (
    <Dialog open={showReview} onOpenChange={setShowReview}>
      <DialogContent className="sm:max-w-[550px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review & Complete Signing</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Review all fields before submitting. You can go back to make
            changes.
          </p>
          <div className="space-y-2">
            {myFields.map((field) => {
              const value =
                localValues[field.id] || field.value;
              const isFilled = !!value || serverFilledIds.has(field.id);
              const isImage = value?.startsWith("data:");
              return (
                <div
                  key={field.id}
                  className="flex items-center justify-between border rounded-lg p-3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isFilled ? (
                      <Check className="h-4 w-4 text-green-600 shrink-0" />
                    ) : (
                      <CircleDot className="h-4 w-4 text-amber-500 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium capitalize">
                        {field.label || field.type}
                      </p>
                      {isFilled && !isImage && (
                        <p className="text-xs text-muted-foreground truncate">
                          {value}
                        </p>
                      )}
                      {isFilled && isImage && (
                        <p className="text-xs text-muted-foreground">
                          [Signature/Initials image]
                        </p>
                      )}
                      {!isFilled && (
                        <p className="text-xs text-amber-600">Not filled</p>
                      )}
                    </div>
                  </div>
                  {isFilled && !serverFilledIds.has(field.id) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        handleClearField(field.id);
                      }}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
          {unsignedFields.length > 0 && (
            <p className="text-sm text-amber-600">
              {unsignedFields.length} required field
              {unsignedFields.length !== 1 ? "s" : ""} still need to be filled.
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowReview(false)}
            >
              Go Back
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              size="lg"
              disabled={submitting || unsignedFields.some((f) => f.required)}
              onClick={handleCompleteSigning}
            >
              {submitting ? "Submitting..." : "Complete Signing"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  // ---------- Company / Title dialog ----------

  const companyTitleDialog = (
    <Dialog open={showCompanyDialog} onOpenChange={setShowCompanyDialog}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Additional Information</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {companyFieldId && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Company</label>
              <Input
                value={companyInput}
                onChange={(e) => setCompanyInput(e.target.value)}
                placeholder="Enter company name"
              />
            </div>
          )}
          {titleFieldId && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                placeholder="Enter your title"
              />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCompanyDialog(false)}
            >
              Skip
            </Button>
            <Button
              onClick={() => {
                if (companyFieldId && companyInput) {
                  setLocalValues((prev) => ({
                    ...prev,
                    [companyFieldId]: companyInput,
                  }));
                }
                if (titleFieldId && titleInput) {
                  setLocalValues((prev) => ({
                    ...prev,
                    [titleFieldId]: titleInput,
                  }));
                }
                setShowCompanyDialog(false);
              }}
            >
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  // Check for company/title fields to show prompt
  useEffect(() => {
    if (verificationStep !== "verified") return;
    const cField = myFields.find(
      (f) =>
        f.type === "text" &&
        f.label?.toLowerCase().includes("company") &&
        !localValues[f.id] &&
        !serverFilledIds.has(f.id)
    );
    const tField = myFields.find(
      (f) =>
        f.type === "text" &&
        f.label?.toLowerCase().includes("title") &&
        !localValues[f.id] &&
        !serverFilledIds.has(f.id)
    );
    if (cField || tField) {
      setCompanyFieldId(cField?.id || null);
      setTitleFieldId(tField?.id || null);
      setShowCompanyDialog(true);
    }
  }, [verificationStep]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- main signing view ----------

  const allFieldsFilled = unsignedFields.length === 0 && filledCount > 0;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top banner */}
      <div className="sticky top-0 z-30 bg-background border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <h1 className="text-sm font-semibold truncate">
                  {data.document.title}
                </h1>
                <p className="text-xs text-muted-foreground">
                  Signing as {data.name}
                  {data.document.senderName
                    ? ` | From: ${data.document.senderName}`
                    : ""}
                </p>
              </div>
            </div>
            <Badge
              variant={allFieldsFilled ? "default" : "secondary"}
              className={allFieldsFilled ? "bg-green-600" : ""}
            >
              {progressPercent}% complete
            </Badge>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-4">
        {/* Message from sender */}
        {data.document.message && (
          <Card>
            <CardContent className="py-3">
              <p className="text-sm text-muted-foreground">
                {data.document.message}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Guided navigation bar */}
        {unsignedFields.length > 0 && (
          <Card>
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentFieldIndex <= 0}
                    onClick={goToPrevField}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <span className="text-sm font-medium px-2">
                    Field {currentFieldIndex + 1} of {unsignedFields.length}
                    {currentUnsigned && (
                      <span className="text-muted-foreground ml-1">
                        ({currentUnsigned.label || currentUnsigned.type})
                      </span>
                    )}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentFieldIndex >= unsignedFields.length - 1}
                    onClick={goToNextField}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                <Button variant="secondary" size="sm" onClick={handleAutoFill}>
                  Auto-fill All
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* PDF with interactive fields */}
        {pdfAttachment ? (
          <Card>
            <CardContent className="pt-6">
              <Suspense
                fallback={<Skeleton className="h-[600px] w-full rounded-lg" />}
              >
                <PdfViewer
                  fileData={pdfAttachment.fileData!}
                  fields={pdfFields}
                  mode="sign"
                  onFieldClick={handleFieldClick}
                  highlightFieldId={highlightFieldId}
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

        {/* Filled fields with clear buttons (Issue #18) */}
        {filledCount > 0 && (
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">
                Filled Fields ({filledCount})
              </CardTitle>
            </CardHeader>
            <CardContent className="py-0 pb-3">
              <div className="flex flex-wrap gap-2">
                {myFields
                  .filter(
                    (f) =>
                      localValues[f.id] && !serverFilledIds.has(f.id)
                  )
                  .map((f) => {
                    const val = localValues[f.id];
                    const isImage = val?.startsWith("data:");
                    return (
                      <div
                        key={f.id}
                        className="flex items-center gap-1 border rounded-full px-3 py-1 text-xs bg-green-50"
                      >
                        <Check className="h-3 w-3 text-green-600" />
                        <span className="capitalize font-medium">
                          {f.label || f.type}
                        </span>
                        {!isImage && (
                          <span className="text-muted-foreground max-w-[120px] truncate">
                            : {val}
                          </span>
                        )}
                        <button
                          onClick={() => handleClearField(f.id)}
                          className="ml-1 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bottom actions */}
        <div className="flex gap-3">
          {unsignedFields.length > 0 && (
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={handleAutoFill}
            >
              Auto-fill Remaining
            </Button>
          )}
          <Button
            size="lg"
            className={
              allFieldsFilled
                ? "flex-1 bg-green-600 hover:bg-green-700 text-white text-lg py-6"
                : "flex-1"
            }
            disabled={submitting || filledCount === 0}
            onClick={() => setShowReview(true)}
          >
            {allFieldsFilled
              ? "Review & Complete Signing"
              : `Review (${filledCount}/${totalFields} filled)`}
          </Button>
        </div>

        {/* Instruction hint */}
        {unsignedFields.length > 0 && filledCount === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Click on the highlighted fields in the document, or use Auto-fill
            to populate all fields at once.
          </p>
        )}
      </div>

      {/* Field input dialog */}
      <FieldInputDialog
        open={!!signingField}
        onOpenChange={(open) => !open && setSigningField(null)}
        field={signingField}
        signerName={data.name}
        signerEmail={data.email}
        onSubmit={handleFieldFill}
      />

      {reviewDialog}
      {companyTitleDialog}
    </div>
  );
}
