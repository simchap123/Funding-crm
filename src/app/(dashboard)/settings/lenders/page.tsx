import { PageHeader } from "@/components/shared/page-header";
import { LendersSettings } from "@/components/lenders/lenders-settings";
import { getLenders } from "@/lib/db/queries/lenders";

export default async function LendersSettingsPage() {
  const lenders = await getLenders();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lenders"
        description="Manage your lender contacts for deal submissions"
      />
      <LendersSettings lenders={lenders as any} />
    </div>
  );
}
