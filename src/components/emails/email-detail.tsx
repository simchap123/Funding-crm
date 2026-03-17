"use client";

import { useCallback, useRef, useState } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Archive,
  Trash2,
  Star,
  StarOff,
  ArrowDownLeft,
  ArrowUpRight,
  Reply,
  Paperclip,
  FileText,
  FileImage,
  FileArchive,
  File,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ComposeEmail } from "@/components/emails/compose-email";
import {
  markEmailStarred,
  archiveEmail,
  deleteEmail,
} from "@/lib/actions/emails";
import type { EmailAccount, EmailAttachment } from "@/lib/types";

type EmailDetailProps = {
  email: {
    id: string;
    direction: string;
    fromEmail: string;
    fromName: string | null;
    toEmails: string;
    ccEmails: string | null;
    subject: string | null;
    bodyHtml: string | null;
    bodyText: string | null;
    isStarred: boolean;
    receivedAt: string | null;
    sentAt: string | null;
    createdAt: string;
    messageId: string | null;
    attachments?: EmailAttachment[];
  };
  accounts: EmailAccount[];
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return File;
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.includes("pdf") || mimeType.includes("document"))
    return FileText;
  if (mimeType.includes("zip") || mimeType.includes("archive"))
    return FileArchive;
  return File;
}

export function EmailDetail({ email, accounts }: EmailDetailProps) {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isInbound = email.direction === "inbound";
  const [replyOpen, setReplyOpen] = useState(false);

  const toList = (() => {
    try {
      return JSON.parse(email.toEmails) as { email: string; name?: string }[];
    } catch {
      return [];
    }
  })();

  const ccList = (() => {
    if (!email.ccEmails) return [];
    try {
      return JSON.parse(email.ccEmails) as { email: string; name?: string }[];
    } catch {
      return [];
    }
  })();

  // Determine reply-to address: if inbound, reply to sender; if outbound, reply to first recipient
  const replyToAddress = isInbound
    ? email.fromEmail
    : toList[0]?.email || "";

  const replySubject = email.subject
    ? email.subject.startsWith("Re: ")
      ? email.subject
      : `Re: ${email.subject}`
    : "Re: (no subject)";

  const handleStar = async () => {
    await markEmailStarred(email.id, !email.isStarred);
    router.refresh();
  };

  const handleArchive = async () => {
    const result = await archiveEmail(email.id);
    if (result.success) {
      toast.success("Email archived");
      router.push("/inbox");
    }
  };

  const handleDelete = async () => {
    const result = await deleteEmail(email.id);
    if (result.success) {
      toast.success("Email deleted");
      router.push("/inbox");
    }
  };

  // Auto-resize iframe to match content height
  const handleIframeLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc?.body) {
        const resizeToContent = () => {
          const height = doc.documentElement.scrollHeight || doc.body.scrollHeight;
          iframe.style.height = `${Math.max(height + 16, 120)}px`;
        };
        resizeToContent();
        // Re-check after images load
        const images = doc.querySelectorAll("img");
        images.forEach((img) => {
          if (!img.complete) {
            img.addEventListener("load", resizeToContent);
          }
        });
      }
    } catch {
      // Cross-origin fallback — keep default height
    }
  }, []);

  const date = email.receivedAt || email.sentAt || email.createdAt;
  const attachments = email.attachments || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/inbox")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">
            {email.subject || "(no subject)"}
          </h1>
        </div>

        <div className="flex items-center gap-1">
          {accounts.length > 0 && (
            <ComposeEmail
              accounts={accounts}
              replyTo={replyToAddress}
              replySubject={replySubject}
              replyInReplyTo={email.messageId || undefined}
              defaultOpen={replyOpen}
              onOpenChange={setReplyOpen}
            >
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => setReplyOpen(true)}
              >
                <Reply className="h-4 w-4" />
                Reply
              </Button>
            </ComposeEmail>
          )}
          <Button variant="ghost" size="icon" onClick={handleStar}>
            {email.isStarred ? (
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            ) : (
              <StarOff className="h-4 w-4" />
            )}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleArchive}>
            <Archive className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Meta */}
      <div className="space-y-1 text-sm border rounded-lg p-4 bg-muted/30">
        <div className="flex items-center gap-2">
          {isInbound ? (
            <ArrowDownLeft className="h-4 w-4 text-blue-600 shrink-0" />
          ) : (
            <ArrowUpRight className="h-4 w-4 text-green-600 shrink-0" />
          )}
          <span className="font-medium">
            {email.fromName || email.fromEmail}
          </span>
          {email.fromName && (
            <span className="text-muted-foreground">
              &lt;{email.fromEmail}&gt;
            </span>
          )}
        </div>

        {toList.length > 0 && (
          <div className="text-muted-foreground">
            <span className="font-medium text-foreground">To: </span>
            {toList.map((t) => t.name || t.email).join(", ")}
          </div>
        )}

        {ccList.length > 0 && (
          <div className="text-muted-foreground">
            <span className="font-medium text-foreground">CC: </span>
            {ccList.map((t) => t.name || t.email).join(", ")}
          </div>
        )}

        <div className="text-muted-foreground">
          {format(new Date(date), "EEEE, MMMM d, yyyy 'at' h:mm a")}
        </div>
      </div>

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="border rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground mb-2">
            <Paperclip className="h-3.5 w-3.5" />
            {attachments.length} attachment{attachments.length !== 1 ? "s" : ""}
          </div>
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment) => {
              const Icon = getFileIcon(attachment.mimeType);
              const size = formatFileSize(attachment.fileSize);
              return (
                <a
                  key={attachment.id}
                  href={attachment.fileUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm transition-colors hover:bg-muted/70"
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate max-w-[180px]">
                    {attachment.fileName}
                  </span>
                  {size && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {size}
                    </span>
                  )}
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Body */}
      <div className="border rounded-lg overflow-hidden">
        {email.bodyHtml ? (
          <iframe
            ref={iframeRef}
            onLoad={handleIframeLoad}
            srcDoc={`
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; line-height: 1.5; padding: 16px; margin: 0; color: #374151; }
                  img { max-width: 100%; }
                  a { color: #2563eb; }
                </style>
              </head>
              <body>${email.bodyHtml}</body>
              </html>
            `}
            sandbox="allow-same-origin"
            className="w-full border-0"
            style={{ height: "120px" }}
            title="Email content"
          />
        ) : (
          <div className="p-4 whitespace-pre-wrap text-sm">
            {email.bodyText || "No content"}
          </div>
        )}
      </div>
    </div>
  );
}
