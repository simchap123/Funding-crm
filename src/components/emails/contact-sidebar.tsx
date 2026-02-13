"use client";

import Link from "next/link";
import { User, Building2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StageBadge } from "@/components/shared/stage-badge";
import { createContactFromEmail } from "@/lib/actions/emails";
import type { LeadStage } from "@/lib/db/schema/contacts";

type ContactInfo = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  company: string | null;
  stage: string;
  contactTags: { tag: { id: string; name: string; color: string } }[];
} | null;

export function ContactSidebar({
  contact,
  emailId,
  senderEmail,
  senderName,
}: {
  contact: ContactInfo;
  emailId: string;
  senderEmail: string;
  senderName: string | null;
}) {
  const router = useRouter();

  const handleAddContact = async () => {
    const result = await createContactFromEmail(emailId);
    if ("error" in result && result.error) {
      toast.error(result.error as string);
      return;
    }
    if (result.existed) {
      toast.info("Email linked to existing contact");
    } else {
      toast.success("Contact created");
    }
    router.refresh();
  };

  if (!contact) {
    return (
      <div className="space-y-4">
        <h3 className="font-medium text-sm text-muted-foreground">Sender</h3>
        <div className="space-y-2">
          <p className="text-sm font-medium">{senderName || senderEmail}</p>
          <p className="text-xs text-muted-foreground">{senderEmail}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleAddContact}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Add as Contact
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-sm text-muted-foreground">Contact</h3>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-4 w-4" />
          </div>
          <div>
            <Link
              href={`/contacts/${contact.id}`}
              className="text-sm font-medium hover:underline"
            >
              {contact.firstName} {contact.lastName}
            </Link>
            {contact.email && (
              <p className="text-xs text-muted-foreground">{contact.email}</p>
            )}
          </div>
        </div>

        {contact.company && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            {contact.company}
          </div>
        )}

        <StageBadge stage={contact.stage as LeadStage} />

        {contact.contactTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {contact.contactTags.map(({ tag }) => (
              <Badge
                key={tag.id}
                variant="outline"
                className="text-xs"
                style={{
                  borderColor: tag.color,
                  color: tag.color,
                }}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
