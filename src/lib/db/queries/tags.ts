import { db } from "@/lib/db";
import { tags, contactTags } from "@/lib/db/schema";
import { asc, eq, sql, count } from "drizzle-orm";

export async function getAllTags() {
  return db.query.tags.findMany({
    orderBy: [asc(tags.name)],
  });
}

export async function getTagsWithCounts() {
  const rows = await db
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
      ownerId: tags.ownerId,
      createdAt: tags.createdAt,
      contactCount: count(contactTags.contactId),
    })
    .from(tags)
    .leftJoin(contactTags, eq(tags.id, contactTags.tagId))
    .groupBy(tags.id)
    .orderBy(asc(tags.name));

  return rows;
}
