import { Plus, Send, Settings } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { InboxList } from "@/components/emails/inbox-list";
import { ComposeEmail } from "@/components/emails/compose-email";
import { SyncButton } from "@/components/emails/sync-button";
import {
  getEmailsWithContactDetails,
  getEmailAccounts,
} from "@/lib/db/queries/emails";
import { auth } from "@/lib/auth";

export default async function InboxPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [emailsResult, accounts] = await Promise.all([
    getEmailsWithContactDetails({ isArchived: false }),
    getEmailAccounts(session.user.id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inbox"
        description="Email communications and lead capture"
      >
        {accounts.length > 0 && (
          <SyncButton accountIds={accounts.map((a) => a.id)} />
        )}
        <Link href="/settings/email">
          <Button variant="outline" size="sm">
            <Settings className="mr-2 h-4 w-4" />
            Email Settings
          </Button>
        </Link>
        {accounts.length > 0 && (
          <ComposeEmail accounts={accounts}>
            <Button>
              <Send className="mr-2 h-4 w-4" />
              Compose
            </Button>
          </ComposeEmail>
        )}
      </PageHeader>

      {accounts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg font-medium mb-2">
            No email accounts connected
          </p>
          <p className="text-muted-foreground mb-4">
            Connect an email account to start receiving and sending emails
          </p>
          <Link href="/settings/email">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Connect Email Account
            </Button>
          </Link>
        </div>
      ) : (
        <InboxList emails={emailsResult.emails as any} />
      )}
    </div>
  );
}
