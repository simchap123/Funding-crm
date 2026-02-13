import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getEmailById } from "@/lib/db/queries/emails";
import { markEmailRead } from "@/lib/actions/emails";
import { EmailDetail } from "@/components/emails/email-detail";
import { ContactSidebar } from "@/components/emails/contact-sidebar";

export default async function EmailDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { id } = await params;
  const email = await getEmailById(id);
  if (!email) notFound();

  // Mark as read
  if (!email.isRead) {
    await markEmailRead(email.id);
  }

  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0">
        <EmailDetail email={email} />
      </div>
      <div className="w-64 shrink-0 hidden lg:block">
        <div className="sticky top-4 border rounded-lg p-4">
          <ContactSidebar
            contact={email.contact as any}
            emailId={email.id}
            senderEmail={email.fromEmail}
            senderName={email.fromName}
          />
        </div>
      </div>
    </div>
  );
}
