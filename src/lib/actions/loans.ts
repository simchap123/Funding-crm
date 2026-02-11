"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { loans, loanActivities, loanConditions } from "@/lib/db/schema";
import {
  loanFormSchema,
  loanConditionSchema,
  type LoanFormValues,
  type LoanConditionFormValues,
} from "@/lib/validators/loans";
import { auth } from "@/lib/auth";
import type { LoanStage } from "@/lib/db/schema/loans";

async function getCurrentUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function createLoan(data: LoanFormValues) {
  const userId = await getCurrentUserId();
  const validated = loanFormSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.issues[0].message };
  }

  const id = nanoid();
  await db.insert(loans).values({
    id,
    ...validated.data,
    amount: validated.data.amount ?? null,
    interestRate: validated.data.interestRate ?? null,
    termMonths: validated.data.termMonths ?? null,
    estimatedValue: validated.data.estimatedValue ?? null,
    downPayment: validated.data.downPayment ?? null,
    creditScore: validated.data.creditScore ?? null,
    annualIncome: validated.data.annualIncome ?? null,
    debtToIncomeRatio: validated.data.debtToIncomeRatio ?? null,
    ownerId: userId,
  });

  await db.insert(loanActivities).values({
    id: nanoid(),
    loanId: id,
    type: "stage_changed",
    description: "Loan application created",
    metadata: JSON.stringify({ to: validated.data.stage || "application" }),
    userId,
  });

  revalidatePath("/loans");
  revalidatePath("/dashboard");

  return { success: true, id };
}

export async function updateLoan(id: string, data: LoanFormValues) {
  const userId = await getCurrentUserId();
  const validated = loanFormSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.issues[0].message };
  }

  const existing = await db.query.loans.findFirst({
    where: eq(loans.id, id),
  });
  if (!existing) return { error: "Loan not found" };

  await db
    .update(loans)
    .set({
      ...validated.data,
      amount: validated.data.amount ?? null,
      interestRate: validated.data.interestRate ?? null,
      termMonths: validated.data.termMonths ?? null,
      estimatedValue: validated.data.estimatedValue ?? null,
      downPayment: validated.data.downPayment ?? null,
      creditScore: validated.data.creditScore ?? null,
      annualIncome: validated.data.annualIncome ?? null,
      debtToIncomeRatio: validated.data.debtToIncomeRatio ?? null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(loans.id, id));

  if (existing.stage !== validated.data.stage) {
    await db.insert(loanActivities).values({
      id: nanoid(),
      loanId: id,
      type: "stage_changed",
      description: `Stage changed from ${existing.stage} to ${validated.data.stage}`,
      metadata: JSON.stringify({
        from: existing.stage,
        to: validated.data.stage,
      }),
      userId,
    });
  }

  revalidatePath("/loans");
  revalidatePath(`/loans/${id}`);
  revalidatePath("/loan-pipeline");
  revalidatePath("/dashboard");

  return { success: true };
}

export async function deleteLoan(id: string) {
  await getCurrentUserId();
  await db.delete(loans).where(eq(loans.id, id));

  revalidatePath("/loans");
  revalidatePath("/loan-pipeline");
  revalidatePath("/dashboard");

  return { success: true };
}

export async function updateLoanStage(id: string, stage: LoanStage) {
  const userId = await getCurrentUserId();

  const existing = await db.query.loans.findFirst({
    where: eq(loans.id, id),
  });
  if (!existing) return { error: "Loan not found" };

  await db
    .update(loans)
    .set({ stage, updatedAt: new Date().toISOString() })
    .where(eq(loans.id, id));

  if (existing.stage !== stage) {
    await db.insert(loanActivities).values({
      id: nanoid(),
      loanId: id,
      type: "stage_changed",
      description: `Stage changed from ${existing.stage} to ${stage}`,
      metadata: JSON.stringify({ from: existing.stage, to: stage }),
      userId,
    });
  }

  revalidatePath("/loans");
  revalidatePath(`/loans/${id}`);
  revalidatePath("/loan-pipeline");
  revalidatePath("/dashboard");

  return { success: true };
}

export async function addLoanCondition(data: LoanConditionFormValues) {
  const userId = await getCurrentUserId();
  const validated = loanConditionSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.issues[0].message };
  }

  const id = nanoid();
  await db.insert(loanConditions).values({
    id,
    ...validated.data,
  });

  await db.insert(loanActivities).values({
    id: nanoid(),
    loanId: validated.data.loanId,
    type: "condition_added",
    description: `Condition added: ${validated.data.title}`,
    userId,
  });

  revalidatePath(`/loans/${validated.data.loanId}`);

  return { success: true, id };
}

export async function updateConditionStatus(
  id: string,
  status: "pending" | "received" | "approved" | "waived"
) {
  const userId = await getCurrentUserId();

  const condition = await db.query.loanConditions.findFirst({
    where: eq(loanConditions.id, id),
  });
  if (!condition) return { error: "Condition not found" };

  await db
    .update(loanConditions)
    .set({
      status,
      clearedAt:
        status === "approved" || status === "waived"
          ? new Date().toISOString()
          : null,
    })
    .where(eq(loanConditions.id, id));

  if (status === "approved" || status === "waived") {
    await db.insert(loanActivities).values({
      id: nanoid(),
      loanId: condition.loanId,
      type: "condition_cleared",
      description: `Condition ${status}: ${condition.title}`,
      userId,
    });
  }

  revalidatePath(`/loans/${condition.loanId}`);

  return { success: true };
}

export async function addLoanActivity(
  loanId: string,
  type: string,
  description: string
) {
  const userId = await getCurrentUserId();

  await db.insert(loanActivities).values({
    id: nanoid(),
    loanId,
    type: type as any,
    description,
    userId,
  });

  revalidatePath(`/loans/${loanId}`);

  return { success: true };
}
