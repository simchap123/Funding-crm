import { db } from "@/lib/db";
import { tags } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

export async function getAllTags() {
  return db.query.tags.findMany({
    orderBy: [asc(tags.name)],
  });
}
