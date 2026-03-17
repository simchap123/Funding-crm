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
import { STAGE_CONFIG } from "@/lib/constants";
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

/**
 * Map STAGE_CONFIG bgColor classes (e.g. "bg-blue-100") to a
 * more saturated dot color for the inline stage indicator.
 */
const STAGE_DOT_COLOR: Record<string, string> = {
  "bg-blue-100": "bg-blue-500",
  "bg-cyan-100": "bg-cyan-500",
  "bg-purple-100": "bg-purple-500",
  "bg-orange-100": "bg-orange-500",
  "bg-yellow-100": "bg-yellow-500",
  "bg-emerald-100": "bg-emerald-500",
  "bg-indigo-100": "bg-indigo-500",
  "bg-green-100": "bg-green-500",
  "bg-red-100": "bg-red-500",
  "bg-gray-100": "bg-gray-400",
};

function getStageDotColor(stage: string): string | null {
  const config = STAGE_CONFIG[stage as LeadStage];
  if (!config) return null;
  return STAGE_DOT_COLOR[config.bgColor] || "bg-gray-400";
}

function getStageLabel(stage: string): string {
  const config = STAGE_CONFIG[stage as LeadStage];
  return config?.label || stage;
}

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

      <div className="border rounded-lg overflow-hidden bg-card">
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

          const date = email.receivedAt || email.sentAt || email.createdAt;
          const stageDot = email.contact ? getStageDotColor(email.contact.stage) : null;

          return (
            <Link
              key={email.id}
              href={`/inbox/${email.id}`}
              prefetch={false}
              className={cn(
                "group relative flex items-start gap-3 py-3 px-4 hover:bg-muted/50 transition-colors border-b last:border-b-0",
                !email.isRead && "border-l-2 border-l-primary",
                email.isRead && "border-l-2 border-l-transparent"
              )}
              onClick={async () => {
                if (!email.isRead) markEmailRead(email.id);
              }}
            >
              {/* Avatar */}
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium mt-0.5",
                  email.contact
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {isInbound ? (
                  getInitial(displayName)
                ) : (
                  <ArrowUpRight className="h-4 w-4 text-green-600" />
                )}
              </div>

              {/* Content — two rows */}
              <div className="flex-1 min-w-0">
                {/* Row 1: Sender + subject + stage dot + date */}
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn(
                      "shrink-0 text-sm",
                      !email.isRead
                        ? "font-semibold text-foreground"
                        : "font-medium text-foreground/80"
                    )}
                  >
                    {displayName}
                  </span>

                  {/* Stage dot */}
                  {stageDot && (
                    <span
                      className={cn("h-1.5 w-1.5 shrink-0 rounded-full", stageDot)}
                      title={getStageLabel(email.contact!.stage)}
                    />
                  )}

                  <span
                    className={cn(
                      "text-sm truncate min-w-0",
                      !email.isRead
                        ? "text-foreground/70"
                        : "text-muted-foreground"
                    )}
                  >
                    {email.subject || "(no subject)"}
                  </span>

                  {/* Spacer pushes date + actions to right */}
                  <span className="flex-1" />

                  {/* Actions — hover-only */}
                  <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleStar(e, email.id, email.isStarred)}
                      className="p-1 rounded hover:bg-muted transition-colors"
                      title={email.isStarred ? "Unstar" : "Star"}
                    >
                      {email.isStarred ? (
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      ) : (
                        <Star className="h-3.5 w-3.5 text-muted-foreground hover:text-yellow-400" />
                      )}
                    </button>
                    {!email.contactId && isInbound && (
                      <button
                        className="p-1 rounded hover:bg-muted transition-colors"
                        title="Add as Contact"
                        onClick={(e) => handleAddContact(e, email.id)}
                      >
                        <UserPlus className="h-3.5 w-3.5 text-blue-600" />
                      </button>
                    )}
                    <button
                      className="p-1 rounded hover:bg-muted transition-colors"
                      title="Archive"
                      onClick={(e) => handleArchive(e, email.id)}
                    >
                      <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button
                      className="p-1 rounded hover:bg-destructive/10 transition-colors"
                      title="Delete"
                      onClick={(e) => handleDelete(e, email.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>

                  {/* Date — hidden when actions visible */}
                  <span className="text-xs text-muted-foreground shrink-0 tabular-nums group-hover:hidden">
                    {formatDate(date)}
                  </span>
                </div>

                {/* Row 2: Snippet */}
                {email.snippet && (
                  <p className="text-sm text-muted-foreground truncate mt-0.5">
                    {email.snippet}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
