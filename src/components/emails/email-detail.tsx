"use client";

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
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  markEmailStarred,
  archiveEmail,
  deleteEmail,
} from "@/lib/actions/emails";

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
  };
};

export function EmailDetail({ email }: EmailDetailProps) {
  const router = useRouter();
  const isInbound = email.direction === "inbound";

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

  const date = email.receivedAt || email.sentAt || email.createdAt;

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

      {/* Body */}
      <div className="border rounded-lg overflow-hidden">
        {email.bodyHtml ? (
          <iframe
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
            className="w-full min-h-[300px] border-0"
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
