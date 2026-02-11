import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { ContactsTableClient } from "@/components/contacts/contacts-table-client";
import { ContactsActions } from "@/components/contacts/contacts-actions";
import { getContacts } from "@/lib/db/queries/contacts";
import { getAllTags } from "@/lib/db/queries/tags";

interface ContactsPageProps {
  searchParams: Promise<{
    q?: string;
    stage?: string;
    tag?: string;
    source?: string;
    page?: string;
    sort?: string;
    order?: string;
  }>;
}

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;

  const [contactsResult, tags] = await Promise.all([
    getContacts({
      q: params.q,
      stage: params.stage,
      tagId: params.tag,
      source: params.source,
      page,
      sort: params.sort,
      order: params.order as "asc" | "desc" | undefined,
    }),
    getAllTags(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Contacts" description="Manage your contacts and leads">
        <ContactsActions />
        <Link href="/contacts/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Contact
          </Button>
        </Link>
      </PageHeader>

      <ContactsTableClient
        data={contactsResult.data}
        tags={tags}
        total={contactsResult.total}
        pageCount={contactsResult.pageCount}
        page={page}
      />
    </div>
  );
}
