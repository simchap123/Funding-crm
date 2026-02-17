import { db } from "@/lib/db";
import { emailAccounts, emails } from "@/lib/db/schema";
import { eq, desc, and, count, sql } from "drizzle-orm";

export async function getEmailAccounts(userId: string) {
  return db.query.emailAccounts.findMany({
    where: eq(emailAccounts.userId, userId),
    orderBy: [desc(emailAccounts.createdAt)],
  });
}

export async function getAllEmailAccounts() {
  return db.query.emailAccounts.findMany({
    orderBy: [desc(emailAccounts.createdAt)],
  });
}

export async function getEmails({
  accountId,
  direction,
  isArchived = false,
  isStarred,
  page = 1,
  limit = 20,
}: {
  accountId?: string;
  direction?: "inbound" | "outbound";
  isArchived?: boolean;
  isStarred?: boolean;
  page?: number;
  limit?: number;
} = {}) {
  const offset = (page - 1) * limit;

  const allEmails = await db.query.emails.findMany({
    with: {
      contact: true,
      attachments: true,
      account: true,
    },
    orderBy: [desc(emails.createdAt)],
    limit,
    offset,
  });

  // Filter in JS since SQLite doesn't handle complex AND conditions well with query builder
  let filtered = allEmails;
  if (accountId) {
    filtered = filtered.filter((e) => e.accountId === accountId);
  }
  if (direction) {
    filtered = filtered.filter((e) => e.direction === direction);
  }
  if (isArchived !== undefined) {
    filtered = filtered.filter((e) => e.isArchived === isArchived);
  }
  if (isStarred !== undefined) {
    filtered = filtered.filter((e) => e.isStarred === isStarred);
  }

  const totalResult = await db.select({ count: count() }).from(emails);

  return {
    emails: filtered,
    total: totalResult[0].count,
    page,
    totalPages: Math.ceil(totalResult[0].count / limit),
  };
}

export async function getEmailById(id: string) {
  return db.query.emails.findFirst({
    where: eq(emails.id, id),
    with: {
      contact: true,
      attachments: true,
      account: true,
    },
  });
}

export async function getEmailsWithContactDetails({
  accountId,
  direction,
  isArchived = false,
  isStarred,
  page = 1,
  limit = 20,
}: {
  accountId?: string;
  direction?: "inbound" | "outbound";
  isArchived?: boolean;
  isStarred?: boolean;
  page?: number;
  limit?: number;
} = {}) {
  const offset = (page - 1) * limit;

  const allEmails = await db.query.emails.findMany({
    with: {
      contact: {
        with: {
          contactTags: {
            with: {
              tag: true,
            },
          },
        },
      },
      attachments: true,
      account: true,
    },
    orderBy: [desc(emails.createdAt)],
    limit,
    offset,
  });

  let filtered = allEmails;
  if (accountId) {
    filtered = filtered.filter((e) => e.accountId === accountId);
  }
  if (direction) {
    filtered = filtered.filter((e) => e.direction === direction);
  }
  if (isArchived !== undefined) {
    filtered = filtered.filter((e) => e.isArchived === isArchived);
  }
  if (isStarred !== undefined) {
    filtered = filtered.filter((e) => e.isStarred === isStarred);
  }

  const totalResult = await db.select({ count: count() }).from(emails);

  return {
    emails: filtered,
    total: totalResult[0].count,
    page,
    totalPages: Math.ceil(totalResult[0].count / limit),
  };
}

export async function getUnreadCount(): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(emails)
    .where(
      and(
        eq(emails.isRead, false),
        eq(emails.isArchived, false)
      )
    );
  return result[0].count;
}

export async function getEmailStats() {
  const allEmails = await db.query.emails.findMany();

  const total = allEmails.length;
  const unread = allEmails.filter((e) => !e.isRead).length;
  const inbound = allEmails.filter((e) => e.direction === "inbound").length;
  const outbound = allEmails.filter((e) => e.direction === "outbound").length;

  return { total, unread, inbound, outbound };
}
