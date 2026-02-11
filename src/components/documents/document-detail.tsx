"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Send,
  Plus,
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
import {
  addRecipient,
  removeRecipient,
  addAttachment,
  removeAttachment,
  sendDocument,
  voidDocument,
} from "@/lib/actions/documents";
import type { DocumentStatus } from "@/lib/db/schema/documents";

type AttachmentType = {
  id: string;
  fileName: string;
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

export function DocumentDetail({ document: doc }: { document: DocumentType }) {
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("signer");

  const isDraft = doc.status === "draft";
  const signingBaseUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/sign/`
      : "/sign/";

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
    const result = await sendDocument(doc.id);
    if ("error" in result && result.error) {
      toast.error(result.error as string);
      return;
    }
    toast.success("Document sent for signing!");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
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
    e.target.value = "";
  };

  const handleRemoveAttachment = async (attachmentId: string) => {
    const result = await removeAttachment(attachmentId);
    if ("error" in result && result.error) {
      toast.error(result.error as string);
      return;
    }
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

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{doc.title}</CardTitle>
              {doc.description && (
                <CardDescription>{doc.description}</CardDescription>
              )}
            </div>
            <div className="flex items-center gap-2">
              <DocumentStatusBadge status={doc.status as DocumentStatus} />
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
                <p className="font-medium">
                  {doc.contact.firstName} {doc.contact.lastName}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Attachments */}
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
                No attachments yet. Upload files that need to be signed.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {doc.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center gap-3 p-3 rounded-lg border"
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
                      {attachment.mimeType && (
                        <span>{attachment.mimeType}</span>
                      )}
                      {attachment.fields.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {attachment.fields.length} signature field
                          {attachment.fields.length !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {isDraft && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive shrink-0"
                      onClick={() => handleRemoveAttachment(attachment.id)}
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
                      <TableCell className="font-medium">{r.name}</TableCell>
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
              {doc.auditLog.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
