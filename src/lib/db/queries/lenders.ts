import { db } from "@/lib/db";
import { lenders, lenderSubmissions, lenderQuotes } from "@/lib/db/schema";
import { eq, asc, desc } from "drizzle-orm";

export async function getLenders() {
  return db.query.lenders.findMany({
    orderBy: [asc(lenders.sortOrder), asc(lenders.name)],
  });
}

export async function getActiveLenders() {
  return db.query.lenders.findMany({
    where: eq(lenders.isActive, true),
    orderBy: [asc(lenders.sortOrder), asc(lenders.name)],
  });
}

export async function getLenderSubmissionsByLoan(loanId: string) {
  return db.query.lenderSubmissions.findMany({
    where: eq(lenderSubmissions.loanId, loanId),
    with: {
      quotes: {
        orderBy: [asc(lenderQuotes.lenderName)],
      },
    },
    orderBy: [desc(lenderSubmissions.createdAt)],
  });
}

export async function getSubmissionWithQuotes(submissionId: string) {
  return db.query.lenderSubmissions.findFirst({
    where: eq(lenderSubmissions.id, submissionId),
    with: {
      quotes: {
        orderBy: [asc(lenderQuotes.lenderName)],
      },
    },
  });
}
