"use client";

import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail,
  Star,
  StarOff,
  Archive,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  UserPlus,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StageBadge } from "@/components/shared/stage-badge";
import {
  markEmailRead,
  markEmailStarred,
  archiveEmail,
  deleteEmail,
  createContactFromEmail,
} from "@/lib/actions/emails";
import { cn } from "@/lib/utils";
import type { LeadStage } from "@/lib/db/schema/contacts";

type ContactTag = {
  tag: { id: string; name: string; color: string };
};

type EmailContact = {
  id: string;
  firstName: string;
  lastName: string;
  company: string | null;
  stage: string;
  contactTags: ContactTag[];
};

type EmailItem = {
  id: string;
  direction: string;
  fromEmail: string;
  fromName: string | null;
  toEmails: string;
  subject: string | null;
  snippet: string | null;
  isRead: boolean;
  isStarred: boolean;
  leadCreated: boolean;
  contactId: string | null;
  contact: EmailContact | null;
  createdAt: string;
  receivedAt: string | null;
  sentAt: string | null;
};

export function InboxList({ emails }: { emails: EmailItem[] }) {
  const router = useRouter();

  const handleStar = async (e: React.MouseEvent, id: string, starred: boolean) => {
    e.stopPropagation();
    await markEmailStarred(id, !starred);
  };

  const handleArchive = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const result = await archiveEmail(id);
    if (result.success) toast.success("Email archived");
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const result = await deleteEmail(id);
    if (result.success) toast.success("Email deleted");
  };

  const handleAddContact = async (e: React.MouseEvent, emailId: string) => {
    e.stopPropagation();
    const result = await createContactFromEmail(emailId);
    if ("error" in result && result.error) {
      toast.error(result.error as string);
      return;
    }
    if (result.existed) {
      toast.info("Linked to existing contact");
    } else {
      toast.success("Contact created");
    }
    router.refresh();
  };

  if (emails.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Mail className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No emails yet</p>
          <p className="text-sm text-muted-foreground">
            Connect an email account and click Sync to fetch emails
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-1">
      {emails.map((email) => {
        const isInbound = email.direction === "inbound";
        const displayName = isInbound
          ? email.fromName || email.fromEmail
          : (() => {
              try {
                const to = JSON.parse(email.toEmails);
                return to[0]?.email || "Unknown";
              } catch {
                return "Unknown";
              }
            })();

        return (
          <Link
            key={email.id}
            href={`/inbox/${email.id}`}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted/50 transition-colors border block",
              !email.isRead && "bg-primary/5 border-primary/20"
            )}
            onClick={async () => {
              if (!email.isRead) await markEmailRead(email.id);
            }}
          >
            {/* Direction indicator */}
            <div className="shrink-0">
              {isInbound ? (
                <ArrowDownLeft className="h-4 w-4 text-blue-600" />
              ) : (
                <ArrowUpRight className="h-4 w-4 text-green-600" />
              )}
            </div>

            {/* Star */}
            <button
              onClick={(e) => handleStar(e, email.id, email.isStarred)}
              className="shrink-0"
            >
              {email.isStarred ? (
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ) : (
                <StarOff className="h-4 w-4 text-muted-foreground hover:text-yellow-400" />
              )}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-sm truncate",
                    !email.isRead && "font-semibold"
                  )}
                >
                  {displayName}
                </span>

                {/* Stage badge */}
                {email.contact && (
                  <StageBadge
                    stage={email.contact.stage as LeadStage}
                    className="text-[10px] px-1.5 py-0"
                  />
                )}

                {/* Tags */}
                {email.contact?.contactTags?.map(({ tag }) => (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 shrink-0 hidden lg:inline-flex"
                    style={{ borderColor: tag.color, color: tag.color }}
                  >
                    {tag.name}
                  </Badge>
                ))}

                {/* Company */}
                {email.contact?.company && (
                  <span className="text-xs text-muted-foreground hidden xl:inline-flex items-center gap-1 shrink-0">
                    <Building2 className="h-3 w-3" />
                    {email.contact.company}
                  </span>
                )}

                {email.leadCreated && (
                  <Badge className="text-xs bg-green-100 text-green-700 border-0 shrink-0">
                    <UserPlus className="h-3 w-3 mr-1" />
                    New Lead
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={cn(
                    "text-sm truncate",
                    !email.isRead ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {email.subject || "(no subject)"}
                </span>
                {email.snippet && (
                  <span className="text-xs text-muted-foreground truncate hidden md:inline">
                    — {email.snippet}
                  </span>
                )}
              </div>
            </div>

            {/* Timestamp */}
            <span className="text-xs text-muted-foreground shrink-0">
              {format(
                new Date(email.receivedAt || email.sentAt || email.createdAt),
                "MMM d"
              )}
            </span>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              {!email.contactId && isInbound && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="Add as Contact"
                  onClick={(e) => handleAddContact(e, email.id)}
                >
                  <UserPlus className="h-3.5 w-3.5 text-blue-600" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => handleArchive(e, email.id)}
              >
                <Archive className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={(e) => handleDelete(e, email.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
