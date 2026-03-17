"use client";

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Send,
  Trash2,
  UserPlus,
  FileSignature,
  Copy,
  CheckCircle2,
  Clock,
  Eye,
  Ban,
  Paperclip,
  FileText,
  Upload,
  Pen,
  Calendar,
  Type,
  Mail,
  ExternalLink,
  CheckSquare,
  Building2,
  BadgeCheck,
  GripVertical,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DocumentStatusBadge } from "./document-status-badge";
import { FieldInputDialog } from "./field-input-dialog";
import {
  addRecipient,
  removeRecipient,
  addAttachment,
  removeAttachment,
  addSignatureField,
  sendDocument,
  voidDocument,
  signField,
  updateSignatureField,
  deleteSignatureField,
} from "@/lib/actions/documents";
import type { DocumentStatus, DocumentFieldType } from "@/lib/db/schema/documents";
import type { FieldPlacement } from "./pdf-viewer";
import { convertDocxToPdfBase64, isConvertibleToDoc } from "@/lib/convert-to-pdf";
import { getContactsForSelect } from "@/lib/actions/contacts";

// Dynamic import with SSR disabled — react-pdf/pdfjs-dist crashes in Node workers
const PdfViewer = dynamic(
  () => import("./pdf-viewer").then((mod) => ({ default: mod.PdfViewer })),
  { ssr: false }
);

type AttachmentType = {
  id: string;
  fileName: string;
  fileData: string | null;
  fileSize: number | null;
  mimeType: string | null;
  pageCount: number | null;
  order: number;
  createdAt: string;
  fields: any[];
};

type RecipientType = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  accessToken: string;
  signedAt: string | null;
  viewedAt: string | null;
  fields: any[];
};

type AuditEntry = {
  id: string;
  action: string;
  actorName: string | null;
  actorEmail: string | null;
  createdAt: string;
};

type ContactOption = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
};

type DocumentType = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  fileName: string | null;
  sentAt: string | null;
  completedAt: string | null;
  createdAt: string;
  message: string | null;
  contactId: string | null;
  loanId: string | null;
  recipients: RecipientType[];
  attachments: AttachmentType[];
  auditLog: AuditEntry[];
  contact: { firstName: string; lastName: string } | null;
  loan: { id: string; loanType: string } | null;
};

const RECIPIENT_STATUS_ICON: Record<string, any> = {
  pending: Clock,
  sent: Send,
  viewed: Eye,
  signed: CheckCircle2,
  declined: Ban,
};

const RECIPIENT_COLORS = ["#3b82f6", "#f97316", "#10b981", "#8b5cf6", "#ec4899", "#f59e0b"];

// Field type groups for the sidebar
const FIELD_TYPE_GROUPS = [
  {
    label: "Signature Fields",
    types: [
      { value: "signature" as const, label: "Signature", icon: Pen, description: "Handwritten signature" },
      { value: "initials" as const, label: "Initials", icon: Pen, description: "Signer's initials" },
    ],
  },
  {
    label: "Auto-fill Fields",
    types: [
      { value: "name" as const, label: "Full Name", icon: Type, description: "Recipient's full name" },
      { value: "email" as const, label: "Email", icon: Mail, description: "Recipient's email address" },
      { value: "date" as const, label: "Date", icon: Calendar, description: "Date signed" },
      { value: "company" as const, label: "Company", icon: Building2, description: "Company name" },
      { value: "title" as const, label: "Title", icon: BadgeCheck, description: "Job title" },
    ],
  },
  {
    label: "Input Fields",
    types: [
      { value: "text" as const, label: "Text", icon: Type, description: "Free text input" },
      { value: "checkbox" as const, label: "Checkbox", icon: CheckSquare, description: "Check / agree box" },
    ],
  },
];

export function DocumentDetail({ document: doc }: { document: DocumentType }) {
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("signer");
  const [contactOptions, setContactOptions] = useState<ContactOption[]>([]);
  const [contactsLoaded, setContactsLoaded] = useState(false);

  // Fetch contacts when the add-recipient dialog opens
  useEffect(() => {
    if (addOpen && !contactsLoaded) {
      getContactsForSelect().then((contacts) => {
        setContactOptions(contacts as ContactOption[]);
        setContactsLoaded(true);
      });
    }
  }, [addOpen, contactsLoaded]);

  const handleContactSelect = (contactId: string) => {
    if (!contactId) return;
    const contact = contactOptions.find((c) => c.id === contactId);
    if (contact) {
      setNewName(`${contact.firstName} ${contact.lastName}`);
      setNewEmail(contact.email || "");
    }
  };

  // PDF & field state
  const [activeAttachment, setActiveAttachment] = useState<AttachmentType | null>(
    doc.attachments?.[0] || null
  );
  const [activeFieldType, setActiveFieldType] = useState<FieldPlacement["type"] | null>(null);
  const [placedFields, setPlacedFields] = useState<FieldPlacement[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>(
    doc.recipients[0]?.id || ""
  );
  // Track dirty (modified) saved field IDs for auto-save
  const [dirtyFieldIds, setDirtyFieldIds] = useState<Set<string>>(new Set());
  const [deletingFieldIds, setDeletingFieldIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Signing state (owner self-sign)
  const [signingField, setSigningField] = useState<FieldPlacement | null>(null);
  const [signingMode, setSigningMode] = useState(false);

  const isDraft = doc.status === "draft";
  const signingBaseUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/sign/`
      : "/sign/";

  // Recipient color mapping
  const recipientColors = useMemo(() => {
    const colors: Record<string, string> = {};
    doc.recipients.forEach((r, i) => {
      colors[r.id] = RECIPIENT_COLORS[i % RECIPIENT_COLORS.length];
    });
    return colors;
  }, [doc.recipients]);

  // Recipient data for merge field previews
  const recipientData = useMemo(() => {
    const data: Record<string, { name: string; email: string }> = {};
    doc.recipients.forEach((r) => {
      data[r.id] = { name: r.name, email: r.email };
    });
    return data;
  }, [doc.recipients]);

  // Build existing fields from DB
  const existingFields: FieldPlacement[] = useMemo(() => {
    if (!activeAttachment) return [];
    return activeAttachment.fields.map((f: any) => ({
      id: f.id,
      type: f.type as FieldPlacement["type"],
      page: f.page,
      xPercent: f.xPercent,
      yPercent: f.yPercent,
      widthPercent: f.widthPercent,
      heightPercent: f.heightPercent,
      label: f.label,
      value: f.value,
      filledAt: f.filledAt,
      recipientId: f.recipientId,
    }));
  }, [activeAttachment]);

  const allFields = [...existingFields, ...placedFields];
  const hasUnsavedChanges = placedFields.length > 0 || dirtyFieldIds.size > 0;

  // Auto-save helper: save all unsaved placed fields and dirty existing fields
  const autoSaveFields = useCallback(async () => {
    if (isSaving) return;
    if (!activeAttachment) return;
    if (placedFields.length === 0 && dirtyFieldIds.size === 0) return;

    const recipientId = placedFields[0]?.recipientId || selectedRecipientId;
    if (!recipientId) return;

    setIsSaving(true);
    try {
      // Save new placed fields
      for (const field of placedFields) {
        const result = await addSignatureField({
          documentId: doc.id,
          recipientId: field.recipientId || selectedRecipientId,
          attachmentId: activeAttachment.id,
          type: field.type as DocumentFieldType,
          page: field.page,
          xPercent: field.xPercent,
          yPercent: field.yPercent,
          widthPercent: field.widthPercent,
          heightPercent: field.heightPercent,
          label: field.label,
        });
        if ("error" in result && result.error) {
          toast.error(result.error as string);
          setIsSaving(false);
          return;
        }
      }

      // Update dirty existing fields
      for (const fieldId of dirtyFieldIds) {
        const field = allFields.find((f) => f.id === fieldId);
        if (!field) continue;
        const result = await updateSignatureField({
          fieldId,
          xPercent: field.xPercent,
          yPercent: field.yPercent,
          widthPercent: field.widthPercent,
          heightPercent: field.heightPercent,
        });
        if ("error" in result && result.error) {
          toast.error(result.error as string);
          setIsSaving(false);
          return;
        }
      }

      const totalSaved = placedFields.length + dirtyFieldIds.size;
      setPlacedFields([]);
      setDirtyFieldIds(new Set());
      setActiveFieldType(null);
      toast.success(`${totalSaved} field(s) saved`);
    } catch {
      toast.error("Failed to save fields. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, activeAttachment, placedFields, dirtyFieldIds, selectedRecipientId, doc.id, allFields]);

  // Auto-save on unmount / navigation
  const autoSaveRef = useRef(autoSaveFields);
  autoSaveRef.current = autoSaveFields;
  useEffect(() => {
    return () => {
      // Trigger auto-save when component unmounts
      autoSaveRef.current();
    };
  }, []);

  const handleAddRecipient = async () => {
    if (!newName.trim() || !newEmail.trim()) return;
    const result = await addRecipient({
      documentId: doc.id,
      name: newName.trim(),
      email: newEmail.trim(),
      role: newRole as any,
    });
    if ("error" in result && result.error) {
      toast.error(result.error as string);
      return;
    }
    toast.success("Recipient added");
    setNewName("");
    setNewEmail("");
    setNewRole("signer");
    setAddOpen(false);
  };

  const handleRemoveRecipient = async (recipientId: string) => {
    const result = await removeRecipient(recipientId);
    if ("error" in result && result.error) {
      toast.error(result.error as string);
      return;
    }
    toast.success("Recipient removed");
  };

  const handleSend = async () => {
    try {
      // Validate: at least one signature field
      const allExistingAndPlaced = [...existingFields, ...placedFields];
      const hasSignatureField = allExistingAndPlaced.some((f) => f.type === "signature");
      if (!hasSignatureField) {
        toast.error("Add at least one signature field before sending");
        return;
      }

      // Validate: every signer-role recipient has at least one field
      const signerRecipients = doc.recipients.filter((r) => r.role === "signer");
      for (const signer of signerRecipients) {
        const signerFields = allExistingAndPlaced.filter((f) => f.recipientId === signer.id);
        if (signerFields.length === 0) {
          toast.error(`Signer "${signer.name}" has no fields assigned. Every signer needs at least one field.`);
          return;
        }
      }

      // Auto-save any placed fields first
      if (placedFields.length > 0 && activeAttachment) {
        if (!selectedRecipientId && !placedFields[0]?.recipientId) {
          toast.error("Please select a recipient before sending");
          return;
        }
        for (const field of placedFields) {
          const result = await addSignatureField({
            documentId: doc.id,
            recipientId: field.recipientId || selectedRecipientId,
            attachmentId: activeAttachment.id,
            type: field.type as DocumentFieldType,
            page: field.page,
            xPercent: field.xPercent,
            yPercent: field.yPercent,
            widthPercent: field.widthPercent,
            heightPercent: field.heightPercent,
            label: field.label,
          });
          if ("error" in result && result.error) {
            toast.error(result.error as string);
            return;
          }
        }
        setPlacedFields([]);
      }

      // Save dirty existing fields
      if (dirtyFieldIds.size > 0) {
        for (const fieldId of dirtyFieldIds) {
          const field = allFields.find((f) => f.id === fieldId);
          if (!field) continue;
          await updateSignatureField({
            fieldId,
            xPercent: field.xPercent,
            yPercent: field.yPercent,
            widthPercent: field.widthPercent,
            heightPercent: field.heightPercent,
          });
        }
        setDirtyFieldIds(new Set());
      }

      const result = await sendDocument(doc.id);
      if ("error" in result && result.error) {
        toast.error(result.error as string);
        return;
      }
      toast.success("Document sent for signing!");
    } catch (err) {
      console.error("[CRM] Send document error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to send document. Please try again.");
    }
  };

  const handleDeleteField = async (field: FieldPlacement) => {
    if (field.id) {
      // Saved field - delete from DB
      const result = await deleteSignatureField(field.id);
      if ("error" in result && result.error) {
        toast.error(result.error as string);
        return;
      }
      toast.success("Field deleted");
    }
    // Also remove from local state if it's a temp field
    if (field.tempId) {
      setPlacedFields((prev) => prev.filter((f) => f.tempId !== field.tempId));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (isConvertibleToDoc(file.type, file.name)) {
        // Convert docx/doc to PDF client-side
        try {
          toast.info(`Converting ${file.name} to PDF...`);
          const pdfBase64 = await convertDocxToPdfBase64(file);
          const result = await addAttachment({
            documentId: doc.id,
            fileName: file.name,
            fileData: pdfBase64,
            fileSize: file.size,
            mimeType: "application/pdf",
            order: (doc.attachments?.length || 0) + i + 1,
          });
          if ("error" in result && result.error) {
            toast.error(result.error as string);
          } else {
            toast.success(`${file.name} converted and uploaded`);
          }
        } catch {
          toast.error(`Failed to convert ${file.name}`);
        }
      } else {
        // PDF or other — store as-is (existing logic)
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = (reader.result as string).split(",")[1];
          const result = await addAttachment({
            documentId: doc.id,
            fileName: file.name,
            fileData: base64,
            fileSize: file.size,
            mimeType: file.type,
            order: (doc.attachments?.length || 0) + i + 1,
          });
          if ("error" in result && result.error) {
            toast.error(result.error as string);
          } else {
            toast.success(`${file.name} uploaded`);
          }
        };
        reader.readAsDataURL(file);
      }
    }
    e.target.value = "";
  };

  const handleRemoveAttachment = async (attachmentId: string) => {
    const result = await removeAttachment(attachmentId);
    if ("error" in result && result.error) {
      toast.error(result.error as string);
      return;
    }
    if (activeAttachment?.id === attachmentId) setActiveAttachment(null);
    toast.success("Attachment removed");
  };

  const handleVoid = async () => {
    const result = await voidDocument(doc.id);
    if (result.success) toast.success("Document voided");
  };

  const copySigningLink = (token: string) => {
    navigator.clipboard.writeText(`${signingBaseUrl}${token}`);
    toast.success("Signing link copied to clipboard");
  };

  // Handle field click in sign mode
  const handleFieldClick = (field: FieldPlacement) => {
    setSigningField(field);
  };

  const handleFieldSubmit = async (fieldId: string, value: string) => {
    // Find the recipient whose fields these are
    // For owner self-sign, we need to find the access token
    const recipient = doc.recipients.find((r) =>
      r.fields.some((f: any) => f.id === fieldId)
    );

    if (recipient) {
      const result = await signField(fieldId, value, recipient.accessToken);
      if ("error" in result && result.error) {
        toast.error(result.error as string);
        return;
      }
      toast.success("Field signed!");
    } else {
      toast.error("Could not find recipient for this field");
    }
  };

  const hasPdfAttachment = activeAttachment?.mimeType === "application/pdf" && activeAttachment?.fileData;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div>
                <CardTitle>{doc.title}</CardTitle>
                {doc.description && (
                  <CardDescription>{doc.description}</CardDescription>
                )}
                {doc.recipients.length > 0 && doc.status !== "draft" && (() => {
                  const signers = doc.recipients.filter((r) => r.role === "signer");
                  const signed = signers.filter((r) => r.status === "signed");
                  return signers.length > 0 ? (
                    <p className="text-sm text-muted-foreground mt-1">
                      {signed.length} of {signers.length} signer{signers.length !== 1 ? "s" : ""} completed
                    </p>
                  ) : null;
                })()}
              </div>
              {hasUnsavedChanges && (
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-400" title="Unsaved field changes" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <DocumentStatusBadge status={doc.status as DocumentStatus} />
              {!isDraft && !signingMode && existingFields.some((f) => !f.filledAt) && (
                <Button variant="outline" onClick={() => setSigningMode(true)}>
                  <Pen className="mr-2 h-4 w-4" />
                  Sign Now
                </Button>
              )}
              {signingMode && (
                <Button variant="outline" onClick={() => setSigningMode(false)}>
                  Done Signing
                </Button>
              )}
              {isDraft && doc.recipients.length > 0 && (
                <Button onClick={handleSend}>
                  <Send className="mr-2 h-4 w-4" />
                  Send for Signing
                </Button>
              )}
              {!["voided", "completed"].includes(doc.status) &&
                doc.status !== "draft" && (
                  <Button variant="outline" onClick={handleVoid}>
                    <Ban className="mr-2 h-4 w-4" />
                    Void
                  </Button>
                )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="font-medium">
                {format(new Date(doc.createdAt), "MMM d, yyyy")}
              </p>
            </div>
            {doc.sentAt && (
              <div>
                <p className="text-muted-foreground">Sent</p>
                <p className="font-medium">
                  {format(new Date(doc.sentAt), "MMM d, yyyy")}
                </p>
              </div>
            )}
            {doc.completedAt && (
              <div>
                <p className="text-muted-foreground">Completed</p>
                <p className="font-medium">
                  {format(new Date(doc.completedAt), "MMM d, yyyy")}
                </p>
              </div>
            )}
            {doc.contact && (
              <div>
                <p className="text-muted-foreground">Contact</p>
                {doc.contactId ? (
                  <Link
                    href={`/contacts/${doc.contactId}`}
                    className="font-medium text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {doc.contact.firstName} {doc.contact.lastName}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : (
                  <p className="font-medium">
                    {doc.contact.firstName} {doc.contact.lastName}
                  </p>
                )}
              </div>
            )}
            {doc.loan && (
              <div>
                <p className="text-muted-foreground">Loan</p>
                {doc.loanId ? (
                  <Link
                    href={`/loans/${doc.loanId}`}
                    className="font-medium text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {doc.loan.loanType}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : (
                  <p className="font-medium">{doc.loan.loanType}</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recipients */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recipients</CardTitle>
          {isDraft && (
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <UserPlus className="mr-1 h-4 w-4" />
                  Add Recipient
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Recipient</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {contactOptions.length > 0 && (
                    <div>
                      <Label>Pick from contacts</Label>
                      <Select onValueChange={handleContactSelect}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a contact..." />
                        </SelectTrigger>
                        <SelectContent>
                          {contactOptions.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.firstName} {c.lastName}
                              {c.email ? ` (${c.email})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="John Smith"
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Select value={newRole} onValueChange={setNewRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="signer">Signer</SelectItem>
                        <SelectItem value="cc">CC</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="approver">Approver</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAddRecipient} className="w-full">
                    Add Recipient
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {doc.recipients.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recipients added yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Signing Link</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doc.recipients.map((r) => {
                  const StatusIcon =
                    RECIPIENT_STATUS_ICON[r.status] || Clock;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: recipientColors[r.id] }}
                          />
                          {r.name}
                        </div>
                      </TableCell>
                      <TableCell>{r.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {r.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <StatusIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="capitalize text-sm">
                            {r.status}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {r.role === "signer" && doc.status !== "draft" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copySigningLink(r.accessToken)}
                          >
                            <Copy className="mr-1 h-3 w-3" />
                            Copy Link
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        {isDraft && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleRemoveRecipient(r.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Attachments list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            Attachments ({doc.attachments?.length || 0})
          </CardTitle>
          {isDraft && (
            <label>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button size="sm" variant="outline" asChild>
                <span>
                  <Upload className="mr-1 h-4 w-4" />
                  Upload Files
                </span>
              </Button>
            </label>
          )}
        </CardHeader>
        <CardContent>
          {(!doc.attachments || doc.attachments.length === 0) ? (
            <div className="text-center py-4">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No attachments yet. Upload a PDF to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {doc.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    activeAttachment?.id === attachment.id
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => setActiveAttachment(attachment)}
                >
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {attachment.fileName}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {attachment.fileSize && (
                        <span>
                          {(attachment.fileSize / 1024).toFixed(0)} KB
                        </span>
                      )}
                      {attachment.mimeType === "application/pdf" && (
                        <Badge variant="outline" className="text-xs">PDF</Badge>
                      )}
                      {attachment.fields.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {attachment.fields.length} field{attachment.fields.length !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {isDraft && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveAttachment(attachment.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* PDF Viewer with field placement - sidebar layout */}
      {hasPdfAttachment && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5" />
              {signingMode ? "Sign Document" : isDraft ? "Prepare Document" : "Document Preview"}
              {hasUnsavedChanges && (
                <span className="inline-block w-2 h-2 rounded-full bg-yellow-400" title="Unsaved changes" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isDraft && doc.recipients.length === 0 && (
              <div className="flex items-center justify-center p-8 border-2 border-dashed rounded-lg bg-muted/30">
                <p className="text-muted-foreground text-center">
                  Add a signer above to start placing fields on the document.
                </p>
              </div>
            )}
            {(doc.recipients.length > 0 || !isDraft) && (
              <div className={isDraft ? "flex gap-4" : ""}>
                {/* Left sidebar for field placement (draft mode only) */}
                {isDraft && (
                  <div className="w-64 shrink-0 space-y-4">
                    {/* Recipient selector */}
                    {doc.recipients.length > 0 && (
                      <div>
                        <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                          Assign to Recipient
                        </Label>
                        <Select value={selectedRecipientId} onValueChange={setSelectedRecipientId}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select recipient..." />
                          </SelectTrigger>
                          <SelectContent>
                            {doc.recipients.map((r) => (
                              <SelectItem key={r.id} value={r.id}>
                                <div className="flex items-center gap-2">
                                  <span
                                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: recipientColors[r.id] }}
                                  />
                                  {r.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Field type groups */}
                    {FIELD_TYPE_GROUPS.map((group) => (
                      <div key={group.label}>
                        <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                          {group.label}
                        </Label>
                        <div className="space-y-1.5">
                          {group.types.map((fieldType) => {
                            const Icon = fieldType.icon;
                            const isActive = activeFieldType === fieldType.value;
                            return (
                              <button
                                key={fieldType.value}
                                disabled={!selectedRecipientId}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors text-sm ${
                                  isActive
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border hover:bg-muted/50"
                                } ${!selectedRecipientId ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                                onClick={() =>
                                  setActiveFieldType(isActive ? null : fieldType.value)
                                }
                              >
                                <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                                <Icon className="h-4 w-4 shrink-0" />
                                <div className="min-w-0">
                                  <p className="font-medium leading-tight">{fieldType.label}</p>
                                  <p className="text-xs text-muted-foreground leading-tight truncate">
                                    {fieldType.description}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* Placed fields summary */}
                    {allFields.length > 0 && (
                      <div>
                        <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">
                          Placed Fields ({allFields.length})
                        </Label>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {allFields.map((field, idx) => {
                            const recipientName = doc.recipients.find(
                              (r) => r.id === field.recipientId
                            )?.name;
                            return (
                              <div
                                key={field.id || field.tempId || idx}
                                className="flex items-center justify-between px-2 py-1.5 rounded border text-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className="inline-block w-2 h-2 rounded-full shrink-0"
                                    style={{
                                      backgroundColor: field.recipientId
                                        ? recipientColors[field.recipientId]
                                        : "#999",
                                    }}
                                  />
                                  <span className="capitalize truncate">{field.type}</span>
                                  {recipientName && (
                                    <span className="text-muted-foreground truncate">
                                      - {recipientName}
                                    </span>
                                  )}
                                </div>
                                <button
                                  className="text-destructive hover:text-destructive/80 shrink-0 ml-1"
                                  onClick={() => handleDeleteField(field)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Save button */}
                    {hasUnsavedChanges && (
                      <Button
                        className="w-full"
                        onClick={autoSaveFields}
                        disabled={isSaving}
                      >
                        {isSaving ? "Saving..." : `Save ${placedFields.length + dirtyFieldIds.size} Field(s)`}
                      </Button>
                    )}
                  </div>
                )}

                {/* PDF viewer area */}
                <div className="flex-1 min-w-0">
                  {activeFieldType && isDraft && (
                    <p className="text-sm text-muted-foreground mb-3">
                      Click anywhere on the PDF to place a <strong>{activeFieldType}</strong> field.
                      {selectedRecipientId
                        ? ` Assigned to: ${doc.recipients.find((r) => r.id === selectedRecipientId)?.name}`
                        : " Select a recipient first."}
                    </p>
                  )}
                  <Suspense fallback={<Skeleton className="h-[600px] w-full rounded-lg" />}>
                    <PdfViewer
                      fileData={activeAttachment!.fileData!}
                      fields={allFields}
                      mode={signingMode ? "sign" : isDraft ? "place-fields" : "view"}
                      onFieldsChange={(fields) => {
                        // Separate existing (have id) from new (have tempId)
                        const newFields: FieldPlacement[] = [];
                        const updatedDirtyIds = new Set(dirtyFieldIds);
                        const incomingIds = new Set<string>();

                        for (const f of fields) {
                          if (f.tempId) {
                            newFields.push(f);
                          } else if (f.id) {
                            incomingIds.add(f.id);
                            // Check if this existing field was moved/resized
                            const original = existingFields.find((ef) => ef.id === f.id);
                            if (
                              original &&
                              (original.xPercent !== f.xPercent ||
                                original.yPercent !== f.yPercent ||
                                original.widthPercent !== f.widthPercent ||
                                original.heightPercent !== f.heightPercent)
                            ) {
                              updatedDirtyIds.add(f.id);
                            }
                          }
                        }

                        // Detect deleted saved fields (were in existingFields but not in incoming)
                        for (const ef of existingFields) {
                          if (ef.id && !incomingIds.has(ef.id) && !deletingFieldIds.has(ef.id)) {
                            // Field was removed via X button — delete from DB
                            setDeletingFieldIds((prev) => new Set(prev).add(ef.id!));
                            deleteSignatureField(ef.id).then((result) => {
                              if ("error" in result && result.error) {
                                toast.error(result.error as string);
                              } else {
                                toast.success("Field deleted");
                              }
                              setDeletingFieldIds((prev) => {
                                const next = new Set(prev);
                                next.delete(ef.id!);
                                return next;
                              });
                            });
                          }
                        }

                        setPlacedFields(newFields);
                        setDirtyFieldIds(updatedDirtyIds);
                      }}
                      onFieldClick={handleFieldClick}
                      activeFieldType={isDraft ? activeFieldType : null}
                      recipientId={selectedRecipientId}
                      recipientColors={recipientColors}
                      recipientData={recipientData}
                    />
                  </Suspense>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
        </CardHeader>
        <CardContent>
          {doc.auditLog.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No activity yet
            </p>
          ) : (
            <div className="space-y-3">
              {doc.auditLog.map((entry) => {
                const AUDIT_ICONS: Record<string, any> = {
                  created: FileSignature,
                  sent: Send,
                  viewed: Eye,
                  signed: CheckCircle2,
                  completed: CheckCircle2,
                  voided: Ban,
                  declined: Ban,
                  recipient_added: UserPlus,
                };
                const AuditIcon =
                  AUDIT_ICONS[entry.action] || Clock;
                return (
                <div key={entry.id} className="flex items-center gap-3 text-sm">
                  <AuditIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <span className="font-medium capitalize">
                      {entry.action.replace("_", " ")}
                    </span>
                    {entry.actorName && (
                      <span className="text-muted-foreground">
                        {" "}
                        by {entry.actorName}
                      </span>
                    )}
                    {entry.actorEmail && (
                      <span className="text-muted-foreground">
                        {" "}
                        ({entry.actorEmail})
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(
                      new Date(entry.createdAt),
                      "MMM d, yyyy 'at' h:mm a"
                    )}
                  </span>
                </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Field input dialog for signing */}
      <FieldInputDialog
        open={!!signingField}
        onOpenChange={(open) => !open && setSigningField(null)}
        field={signingField}
        onSubmit={handleFieldSubmit}
      />
    </div>
  );
}
