import { PageHeader } from "@/components/shared/page-header";
import { TagsManager } from "@/components/contacts/tags-manager";
import { getTagsWithCounts } from "@/lib/db/queries/tags";

export default async function TagsSettingsPage() {
  const tags = await getTagsWithCounts();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tags"
        description="Manage tags to organize your contacts"
      />
      <TagsManager tags={tags} />
    </div>
  );
}
