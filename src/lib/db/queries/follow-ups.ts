import { db } from "@/lib/db";
import { followUps } from "@/lib/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export async function getFollowUpsByDateRange(startDate: string, endDate: string) {
  return db.query.followUps.findMany({
    where: and(
      gte(followUps.dueDate, startDate),
      lte(followUps.dueDate, endDate)
    ),
    with: {
      contact: true,
      loan: true,
    },
    orderBy: [desc(followUps.dueDate)],
  });
}

export async function getFollowUpsByContact(contactId: string) {
  return db.query.followUps.findMany({
    where: eq(followUps.contactId, contactId),
    with: {
      contact: true,
      loan: true,
    },
    orderBy: [desc(followUps.dueDate)],
  });
}

export async function getFollowUpsByLoan(loanId: string) {
  return db.query.followUps.findMany({
    where: eq(followUps.loanId, loanId),
    with: {
      contact: true,
      loan: true,
    },
    orderBy: [desc(followUps.dueDate)],
  });
}

export async function getUpcomingFollowUps(limit = 10) {
  const today = new Date().toISOString().split("T")[0];
  return db.query.followUps.findMany({
    where: and(
      gte(followUps.dueDate, today),
      eq(followUps.status, "scheduled")
    ),
    with: {
      contact: true,
      loan: true,
    },
    orderBy: [desc(followUps.dueDate)],
    limit,
  });
}

export async function getOverdueFollowUps() {
  const today = new Date().toISOString().split("T")[0];
  return db.query.followUps.findMany({
    where: and(
      lte(followUps.dueDate, today),
      eq(followUps.status, "scheduled")
    ),
    with: {
      contact: true,
    },
    orderBy: [desc(followUps.dueDate)],
  });
}
