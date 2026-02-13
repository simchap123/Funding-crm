import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { InviteUserForm } from "@/components/settings/invite-user-form";

export default async function AccountSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const isAdmin = (session.user as any).role === "admin";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account Settings"
        description="Manage your account and team members"
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChangePasswordForm />
        {isAdmin && <InviteUserForm />}
      </div>
    </div>
  );
}
