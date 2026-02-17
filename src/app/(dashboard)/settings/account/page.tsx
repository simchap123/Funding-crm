import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { InviteUserForm } from "@/components/settings/invite-user-form";
import { UserManagement } from "@/components/settings/user-management";
import { getUsers } from "@/lib/actions/auth";

export default async function AccountSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const isAdmin = (session.user as any).role === "admin";

  const usersResult = isAdmin ? await getUsers() : null;
  const userList = (usersResult && "users" in usersResult ? usersResult.users : []) ?? [];

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
      {isAdmin && userList.length > 0 && (
        <UserManagement
          users={userList as any}
          currentUserId={session.user.id}
        />
      )}
    </div>
  );
}
