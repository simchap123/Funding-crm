import { db } from "@/lib/db";
import { contacts, activities } from "@/lib/db/schema";
import { count, eq, sql, desc, and, gte } from "drizzle-orm";
import type { LeadStage } from "@/lib/db/schema/contacts";
import { LEAD_STAGES } from "@/lib/db/schema/contacts";

export async function getDashboardMetrics() {
  const [totalResult] = await db
    .select({ count: count() })
    .from(contacts);

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weekStr = oneWeekAgo.toISOString();

  const [newThisWeekResult] = await db
    .select({ count: count() })
    .from(contacts)
    .where(gte(contacts.createdAt, weekStr));

  const [wonResult] = await db
    .select({ count: count() })
    .from(contacts)
    .where(eq(contacts.stage, "won"));

  const [lostResult] = await db
    .select({ count: count() })
    .from(contacts)
    .where(eq(contacts.stage, "lost"));

  const closedDeals = wonResult.count + lostResult.count;
  const conversionRate = closedDeals > 0
    ? Math.round((wonResult.count / closedDeals) * 100)
    : 0;

  return {
    totalContacts: totalResult.count,
    newThisWeek: newThisWeekResult.count,
    conversionRate,
    wonDeals: wonResult.count,
  };
}

export async function getContactsByStageCount() {
  const results = await db
    .select({
      stage: contacts.stage,
      count: count(),
    })
    .from(contacts)
    .groupBy(contacts.stage);

  const stageMap: Record<string, number> = {};
  for (const stage of LEAD_STAGES) {
    stageMap[stage] = 0;
  }
  for (const row of results) {
    stageMap[row.stage] = row.count;
  }

  return stageMap;
}

export async function getRecentContacts(limit = 5) {
  return db.query.contacts.findMany({
    orderBy: [desc(contacts.createdAt)],
    limit,
    with: {
      contactTags: {
        with: { tag: true },
      },
    },
  });
}

export async function getRecentActivities(limit = 10) {
  return db.query.activities.findMany({
    orderBy: [desc(activities.createdAt)],
    limit,
    with: {
      contact: true,
      user: true,
    },
  });
}
