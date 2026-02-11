import { db } from "@/lib/db";
import { loans, loanActivities, loanConditions } from "@/lib/db/schema";
import { eq, desc, like, or, sql, count } from "drizzle-orm";
import type { LoanStage } from "@/lib/db/schema/loans";

export async function getLoans({
  search,
  stage,
  page = 1,
  limit = 10,
}: {
  search?: string;
  stage?: LoanStage;
  page?: number;
  limit?: number;
} = {}) {
  const offset = (page - 1) * limit;

  let query = db.query.loans.findMany({
    with: {
      contact: true,
    },
    orderBy: [desc(loans.createdAt)],
    limit,
    offset,
  });

  // For filtered queries, use select with where
  const conditions: any[] = [];
  if (stage) {
    conditions.push(eq(loans.stage, stage));
  }
  if (search) {
    conditions.push(
      or(
        like(loans.loanNumber, `%${search}%`),
        like(loans.lender, `%${search}%`),
        like(loans.propertyAddress, `%${search}%`)
      )
    );
  }

  if (conditions.length > 0) {
    const allLoans = await db.query.loans.findMany({
      with: { contact: true },
      where: conditions.length === 1 ? conditions[0] : sql`${conditions[0]} AND ${conditions[1]}`,
      orderBy: [desc(loans.createdAt)],
      limit,
      offset,
    });

    const totalResult = await db
      .select({ count: count() })
      .from(loans)
      .where(conditions.length === 1 ? conditions[0] : sql`${conditions[0]} AND ${conditions[1]}`);

    return {
      loans: allLoans,
      total: totalResult[0].count,
      page,
      totalPages: Math.ceil(totalResult[0].count / limit),
    };
  }

  const allLoans = await query;
  const totalResult = await db.select({ count: count() }).from(loans);

  return {
    loans: allLoans,
    total: totalResult[0].count,
    page,
    totalPages: Math.ceil(totalResult[0].count / limit),
  };
}

export async function getLoanById(id: string) {
  return db.query.loans.findFirst({
    where: eq(loans.id, id),
    with: {
      contact: {
        with: {
          contactTags: {
            with: { tag: true },
          },
        },
      },
      loanActivities: {
        orderBy: [desc(loanActivities.createdAt)],
      },
      conditions: {
        orderBy: [desc(loanConditions.createdAt)],
      },
      documents: {
        with: { recipients: true },
      },
    },
  });
}

export async function getLoansByStage() {
  const allLoans = await db.query.loans.findMany({
    with: {
      contact: true,
    },
    orderBy: [desc(loans.createdAt)],
  });

  const grouped: Record<LoanStage, typeof allLoans> = {
    application: [],
    processing: [],
    underwriting: [],
    conditional_approval: [],
    approved: [],
    closing: [],
    funded: [],
    denied: [],
    withdrawn: [],
  };

  for (const loan of allLoans) {
    grouped[loan.stage as LoanStage].push(loan);
  }

  return grouped;
}

export async function getLoanStats() {
  const allLoans = await db.query.loans.findMany();

  const total = allLoans.length;
  const totalValue = allLoans.reduce((sum, l) => sum + (l.amount || 0), 0);
  const activeLoans = allLoans.filter(
    (l) => !["funded", "denied", "withdrawn"].includes(l.stage)
  );
  const fundedLoans = allLoans.filter((l) => l.stage === "funded");
  const fundedValue = fundedLoans.reduce(
    (sum, l) => sum + (l.amount || 0),
    0
  );

  const byStage: Record<string, number> = {};
  for (const loan of allLoans) {
    byStage[loan.stage] = (byStage[loan.stage] || 0) + 1;
  }

  return {
    total,
    totalValue,
    activeCount: activeLoans.length,
    fundedCount: fundedLoans.length,
    fundedValue,
    byStage,
  };
}
