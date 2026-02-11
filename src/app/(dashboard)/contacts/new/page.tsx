import { PageHeader } from "@/components/shared/page-header";
import { ContactForm } from "@/components/contacts/contact-form";

export default function NewContactPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="New Contact"
        description="Add a new contact to your CRM"
      />
      <ContactForm />
    </div>
  );
}
