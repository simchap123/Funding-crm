import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getContactById } from "@/lib/db/queries/contacts";
import { ContactDetailCard } from "@/components/contacts/contact-detail-card";
import { NotesSection } from "@/components/contacts/notes-section";
import { ActivityTimeline } from "@/components/contacts/activity-timeline";
import { ContactDeleteButton } from "@/components/contacts/contact-delete-button";
import { ContactLoansSection } from "@/components/contacts/contact-loans-section";
import { ContactDocumentsSection } from "@/components/contacts/contact-documents-section";
import type { ContactWithDetails } from "@/lib/types";

interface ContactDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}

export default async function ContactDetailPage({
  params,
  searchParams,
}: ContactDetailPageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const contact = await getContactById(id);

  if (!contact) {
    notFound();
  }

  const isEditing = sp.edit === "true";

  if (isEditing) {
    const { ContactForm } = await import(
      "@/components/contacts/contact-form"
    );
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/contacts/${id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">
            Edit {contact.firstName} {contact.lastName}
          </h1>
        </div>
        <ContactForm contact={contact} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/contacts">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">
              {contact.firstName} {contact.lastName}
            </h1>
            {contact.company && (
              <p className="text-muted-foreground">{contact.company}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/contacts/${id}?edit=true`}>
            <Button variant="outline" size="sm">
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          <ContactDeleteButton contactId={id} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          <ContactDetailCard contact={contact as ContactWithDetails} />
          <ContactLoansSection
            contactId={id}
            loans={(contact as any).loans || []}
          />
          <ContactDocumentsSection
            contactId={id}
            documents={(contact as any).documents || []}
          />
          <NotesSection contactId={id} notes={contact.notes} />
        </div>
        <div>
          <ActivityTimeline activities={contact.activities} />
        </div>
      </div>
    </div>
  );
}
