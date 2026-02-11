import { db } from "@/lib/db";
import { contacts, contactTags, tags } from "@/lib/db/schema";
import { eq, desc, asc, and, inArray, sql, count } from "drizzle-orm";
import type { LeadStage } from "@/lib/db/schema/contacts";
import { ITEMS_PER_PAGE } from "@/lib/constants";

interface GetContactsParams {
  q?: string;
  stage?: string;
  tagId?: string;
  source?: string;
  page?: number;
  sort?: string;
  order?: "asc" | "desc";
  ownerId?: string;
}

export async function getContacts({
  q,
  stage,
  tagId,
  source,
  page = 1,
  sort = "createdAt",
  order = "desc",
  ownerId,
}: GetContactsParams = {}) {
  const offset = (page - 1) * ITEMS_PER_PAGE;
  const conditions: ReturnType<typeof eq>[] = [];

  if (ownerId) {
    conditions.push(eq(contacts.ownerId, ownerId));
  }
  if (stage) {
    conditions.push(eq(contacts.stage, stage as LeadStage));
  }
  if (source) {
    conditions.push(eq(contacts.source, source as any));
  }

  // FTS search
  let ftsContactIds: string[] | null = null;
  if (q) {
    const ftsResults = await db.all<{ id: string }>(
      sql`SELECT id FROM contacts_fts WHERE contacts_fts MATCH ${q + "*"}`
    );
    ftsContactIds = ftsResults.map((r) => r.id);
    if (ftsContactIds.length === 0) {
      return { data: [], total: 0, pageCount: 0 };
    }
    conditions.push(inArray(contacts.id, ftsContactIds));
  }

  // Tag filter
  if (tagId) {
    const taggedContactIds = await db
      .select({ contactId: contactTags.contactId })
      .from(contactTags)
      .where(eq(contactTags.tagId, tagId));
    const ids = taggedContactIds.map((r) => r.contactId);
    if (ids.length === 0) {
      return { data: [], total: 0, pageCount: 0 };
    }
    conditions.push(inArray(contacts.id, ids));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Get sort column
  const sortColumn =
    sort === "firstName"
      ? contacts.firstName
      : sort === "lastName"
        ? contacts.lastName
        : sort === "email"
          ? contacts.email
          : sort === "company"
            ? contacts.company
            : sort === "stage"
              ? contacts.stage
              : sort === "score"
                ? contacts.score
                : contacts.createdAt;

  const orderFn = order === "asc" ? asc : desc;

  const [data, totalResult] = await Promise.all([
    db.query.contacts.findMany({
      where,
      with: {
        contactTags: {
          with: { tag: true },
        },
      },
      orderBy: [orderFn(sortColumn)],
      limit: ITEMS_PER_PAGE,
      offset,
    }),
    db.select({ count: count() }).from(contacts).where(where),
  ]);

  const total = totalResult[0].count;

  return {
    data,
    total,
    pageCount: Math.ceil(total / ITEMS_PER_PAGE),
  };
}

export async function getContactById(id: string) {
  return db.query.contacts.findFirst({
    where: eq(contacts.id, id),
    with: {
      contactTags: {
        with: { tag: true },
      },
      notes: {
        orderBy: (notes, { desc }) => [desc(notes.pinned), desc(notes.createdAt)],
      },
      activities: {
        orderBy: (activities, { desc }) => [desc(activities.createdAt)],
      },
      loans: {
        with: {
          documents: {
            with: { recipients: true },
          },
        },
        orderBy: (loans, { desc }) => [desc(loans.createdAt)],
      },
      documents: {
        with: { recipients: true },
        orderBy: (documents, { desc }) => [desc(documents.createdAt)],
      },
      emails: {
        orderBy: (emails, { desc }) => [desc(emails.createdAt)],
        limit: 10,
      },
      owner: true,
    },
  });
}

export async function getContactsByStage(ownerId?: string) {
  const where = ownerId ? eq(contacts.ownerId, ownerId) : undefined;

  const data = await db.query.contacts.findMany({
    where,
    with: {
      contactTags: {
        with: { tag: true },
      },
    },
    orderBy: [asc(contacts.createdAt)],
  });

  const grouped: Record<LeadStage, typeof data> = {
    new: [],
    contacted: [],
    qualified: [],
    proposal: [],
    negotiation: [],
    won: [],
    lost: [],
  };

  for (const contact of data) {
    grouped[contact.stage as LeadStage].push(contact);
  }

  return grouped;
}
