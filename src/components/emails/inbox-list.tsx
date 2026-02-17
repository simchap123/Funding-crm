"use client";

import { useState } from "react";
import { format, isToday, isYesterday, isThisYear } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail,
  Star,
  Archive,
  Trash2,
  ArrowUpRight,
  UserPlus,
  Search,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
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

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  if (isThisYear(d)) return format(d, "MMM d");
  return format(d, "MMM d, yyyy");
}

function getInitial(name: string) {
  return name.charAt(0).toUpperCase();
}

export function InboxList({ emails }: { emails: EmailItem[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [dirFilter, setDirFilter] = useState<"all" | "inbound" | "outbound">("all");

  const handleStar = async (e: React.MouseEvent, id: string, starred: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    await markEmailStarred(id, !starred);
  };

  const handleArchive = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const result = await archiveEmail(id);
    if (result.success) toast.success("Email archived");
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const result = await deleteEmail(id);
    if (result.success) toast.success("Email deleted");
  };

  const handleAddContact = async (e: React.MouseEvent, emailId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const result = await createContactFromEmail(emailId);
    if ("error" in result && result.error) {
      toast.error(result.error as string);
      return;
    }
    toast.success(result.existed ? "Linked to existing contact" : "Contact created");
    router.refresh();
  };

  const q = search.toLowerCase();
  const filtered = emails.filter((email) => {
    if (dirFilter !== "all" && email.direction !== dirFilter) return false;
    if (!q) return true;
    const name = email.fromName || email.fromEmail;
    return (
      name.toLowerCase().includes(q) ||
      email.fromEmail.toLowerCase().includes(q) ||
      (email.subject || "").toLowerCase().includes(q) ||
      (email.snippet || "").toLowerCase().includes(q)
    );
  });

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
    <div className="space-y-3">
      {/* Search + filter bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search emails..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center rounded-md border text-xs overflow-hidden shrink-0">
          {(["all", "inbound", "outbound"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDirFilter(d)}
              className={cn(
                "px-2.5 py-1.5 capitalize transition-colors",
                dirFilter === d
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground"
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">No emails match your search</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="border rounded-lg divide-y overflow-hidden bg-card">
      {filtered.map((email) => {
        const isInbound = email.direction === "inbound";
        const displayName = isInbound
          ? email.fromName || email.fromEmail.split("@")[0]
          : (() => {
              try {
                const to = JSON.parse(email.toEmails);
                return to[0]?.name || to[0]?.email?.split("@")[0] || "Unknown";
              } catch {
                return "Unknown";
              }
            })();

        const displayEmail = isInbound ? email.fromEmail : (() => {
          try {
            const to = JSON.parse(email.toEmails);
            return to[0]?.email || "";
          } catch {
            return "";
          }
        })();

        const date = email.receivedAt || email.sentAt || email.createdAt;

        return (
          <Link
            key={email.id}
            href={`/inbox/${email.id}`}
            prefetch={false}
            className={cn(
              "group flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors",
              !email.isRead && "bg-blue-50/50 dark:bg-blue-950/20"
            )}
            onClick={async () => {
              if (!email.isRead) markEmailRead(email.id);
            }}
          >
            {/* Avatar / Direction */}
            <div className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium",
              email.contact
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            )}>
              {isInbound ? (
                getInitial(displayName)
              ) : (
                <ArrowUpRight className="h-3.5 w-3.5 text-green-600" />
              )}
            </div>

            {/* Star */}
            <button
              onClick={(e) => handleStar(e, email.id, email.isStarred)}
              className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            >
              {email.isStarred ? (
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ) : (
                <Star className="h-4 w-4 text-muted-foreground/40 hover:text-yellow-400" />
              )}
            </button>

            {/* Sender name — fixed width column */}
            <div className="w-36 shrink-0 truncate">
              <span className={cn(
                "text-sm",
                !email.isRead ? "font-semibold text-foreground" : "text-muted-foreground"
              )}>
                {displayName}
              </span>
            </div>

            {/* Subject + snippet — fills remaining space */}
            <div className="flex-1 min-w-0 flex items-center gap-2">
              {/* Contact badges inline before subject */}
              {email.contact && (
                <StageBadge
                  stage={email.contact.stage as LeadStage}
                  className="text-[10px] leading-none px-1.5 py-0.5 shrink-0"
                />
              )}
              {email.contact?.contactTags?.slice(0, 2).map(({ tag }) => (
                <span
                  key={tag.id}
                  className="text-[10px] leading-none px-1.5 py-0.5 rounded-full border shrink-0 hidden lg:inline"
                  style={{ borderColor: tag.color, color: tag.color }}
                >
                  {tag.name}
                </span>
              ))}
              <span className={cn(
                "text-sm truncate",
                !email.isRead ? "text-foreground" : "text-muted-foreground"
              )}>
                {email.subject || "(no subject)"}
              </span>
              {email.snippet && (
                <span className="text-sm text-muted-foreground/60 truncate hidden sm:inline">
                  — {email.snippet}
                </span>
              )}
            </div>

            {/* Actions — show on hover */}
            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              {!email.contactId && isInbound && (
                <button
                  className="p-1.5 rounded hover:bg-muted transition-colors"
                  title="Add as Contact"
                  onClick={(e) => handleAddContact(e, email.id)}
                >
                  <UserPlus className="h-3.5 w-3.5 text-blue-600" />
                </button>
              )}
              <button
                className="p-1.5 rounded hover:bg-muted transition-colors"
                title="Archive"
                onClick={(e) => handleArchive(e, email.id)}
              >
                <Archive className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <button
                className="p-1.5 rounded hover:bg-destructive/10 transition-colors"
                title="Delete"
                onClick={(e) => handleDelete(e, email.id)}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </button>
            </div>

            {/* Date — fixed width right-aligned */}
            <span className="text-xs text-muted-foreground shrink-0 w-16 text-right tabular-nums group-hover:hidden">
              {formatDate(date)}
            </span>
          </Link>
        );
      })}
      </div>
    </div>
  );
}
