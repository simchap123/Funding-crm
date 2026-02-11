import { PageHeader } from "@/components/shared/page-header";
import { EmailAccountForm } from "@/components/emails/email-account-form";
import { getEmailAccounts } from "@/lib/db/queries/emails";
import { auth } from "@/lib/auth";

export default async function EmailSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const accounts = await getEmailAccounts(session.user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email Settings"
        description="Connect and manage your email accounts"
      />

      <EmailAccountForm accounts={accounts} />
    </div>
  );
}
