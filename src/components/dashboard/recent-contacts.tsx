import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StageBadge } from "@/components/shared/stage-badge";
import type { ContactWithTags } from "@/lib/types";
import type { LeadStage } from "@/lib/db/schema/contacts";

interface RecentContactsProps {
  contacts: ContactWithTags[];
}

export function RecentContacts({ contacts }: RecentContactsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Contacts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {contacts.map((contact) => (
            <Link
              key={contact.id}
              href={`/contacts/${contact.id}`}
              className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted transition-colors"
            >
              <Avatar className="h-9 w-9">
                <AvatarFallback className="text-xs">
                  {contact.firstName[0]}
                  {contact.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {contact.firstName} {contact.lastName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {contact.company || contact.email || "No details"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StageBadge stage={contact.stage as LeadStage} />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(contact.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </Link>
          ))}
          {contacts.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No contacts yet
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
