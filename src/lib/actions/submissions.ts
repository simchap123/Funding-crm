"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  lenders,
  lenderSubmissions,
  lenderQuotes,
  emails,
  emailAccounts,
  loanActivities,
  loans,
} from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { sendEmailViaSMTP } from "@/lib/email/smtp-send";
import type { QuoteStatus } from "@/lib/db/schema/lenders";

async function getCurrentUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function submitToLenders(input: {
  loanId: string;
  lenderIds: string[];
  subject: string;
  message: string;
  accountId?: string;
}) {
  const userId = await getCurrentUserId();

  if (!input.lenderIds.length || input.lenderIds.length > 15) {
    return { error: "Select between 1 and 15 lenders" };
  }

  // Fetch selected lenders
  const selectedLenders = await db.query.lenders.findMany({
    where: (l, { inArray }) => inArray(l.id, input.lenderIds),
  });

  if (!selectedLenders.length) {
    return { error: "No valid lenders found" };
  }

  // Fetch loan for context
  const loan = await db.query.loans.findFirst({
    where: eq(loans.id, input.loanId),
    with: { contact: true },
  });
  if (!loan) return { error: "Loan not found" };

  // Get email account to send from
  const accountQuery = input.accountId
    ? await db.query.emailAccounts.findFirst({
        where: eq(emailAccounts.id, input.accountId),
      })
    : await db.query.emailAccounts.findFirst({
        where: eq(emailAccounts.isActive, true),
      });

  if (!accountQuery) {
    return {
      error:
        "No email account configured. Please add an email account in Settings.",
    };
  }

  const lenderEmailList = selectedLenders.map((l) => l.email);
  const lenderIdsList = selectedLenders.map((l) => l.id);

  // Send via SMTP (broker sends to themselves, BCC all lenders)
  let smtpMessageId: string | null = null;
  try {
    const result = await sendEmailViaSMTP(accountQuery, {
      to: [accountQuery.email],
      bcc: lenderEmailList,
      subject: input.subject,
      html: input.message,
      text: input.message.replace(/<[^>]*>/g, ""),
    });
    smtpMessageId = result.messageId;
  } catch (err) {
    console.error("[CRM] Lender submission SMTP failed:", err);
    return {
      error: `Failed to send: ${err instanceof Error ? err.message : "SMTP error"}`,
    };
  }

  const bodyText = input.message.replace(/<[^>]*>/g, "");

  // Store the email record
  const emailId = nanoid();
  await db.insert(emails).values({
    id: emailId,
    accountId: accountQuery.id,
    messageId: smtpMessageId || `<${emailId}@crm.local>`,
    direction: "outbound",
    status: "sent",
    fromEmail: accountQuery.email,
    fromName: accountQuery.name || null,
    toEmails: JSON.stringify([{ email: accountQuery.email }]),
    bccEmails: JSON.stringify(lenderEmailList.map((e) => ({ email: e }))),
    subject: input.subject,
    bodyHtml: input.message,
    bodyText,
    snippet: bodyText.slice(0, 200),
    isRead: true,
    userId,
    sentAt: new Date().toISOString(),
  });

  // Create submission record
  const submissionId = nanoid();
  await db.insert(lenderSubmissions).values({
    id: submissionId,
    loanId: input.loanId,
    emailId,
    subject: input.subject,
    message: input.message,
    lenderIds: JSON.stringify(lenderIdsList),
    lenderEmails: JSON.stringify(lenderEmailList),
    sentAt: new Date().toISOString(),
    ownerId: userId,
  });

  // Create one quote row per lender (status: pending)
  for (const lender of selectedLenders) {
    await db.insert(lenderQuotes).values({
      id: nanoid(),
      submissionId,
      lenderId: lender.id,
      lenderName: lender.name,
      status: "pending",
    });
  }

  // Add loan activity
  await db.insert(loanActivities).values({
    id: nanoid(),
    loanId: input.loanId,
    type: "document_sent",
    description: `Submitted to ${selectedLenders.length} lender${selectedLenders.length !== 1 ? "s" : ""}: ${selectedLenders.map((l) => l.name).join(", ")}`,
    userId,
  });

  revalidatePath(`/loans/${input.loanId}`);
  revalidatePath("/inbox");

  return { success: true, submissionId };
}

export async function updateQuoteStatus(
  quoteId: string,
  status: QuoteStatus
) {
  const userId = await getCurrentUserId();

  const quote = await db.query.lenderQuotes.findFirst({
    where: eq(lenderQuotes.id, quoteId),
  });
  if (!quote) return { error: "Quote not found" };

  await db
    .update(lenderQuotes)
    .set({
      status,
      receivedAt:
        status === "received" ? new Date().toISOString() : quote.receivedAt,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(lenderQuotes.id, quoteId));

  // Get submission to revalidate loan path
  const submission = await db.query.lenderSubmissions.findFirst({
    where: eq(lenderSubmissions.id, quote.submissionId),
  });

  if (submission) {
    revalidatePath(`/loans/${submission.loanId}`);
  }

  return { success: true };
}

export async function saveQuote(
  quoteId: string,
  data: {
    status: QuoteStatus;
    rate?: number | null;
    points?: number | null;
    fees?: number | null;
    loanAmount?: number | null;
    termMonths?: number | null;
    notes?: string | null;
  }
) {
  await getCurrentUserId();

  const quote = await db.query.lenderQuotes.findFirst({
    where: eq(lenderQuotes.id, quoteId),
  });
  if (!quote) return { error: "Quote not found" };

  await db
    .update(lenderQuotes)
    .set({
      status: data.status,
      rate: data.rate ?? null,
      points: data.points ?? null,
      fees: data.fees ?? null,
      loanAmount: data.loanAmount ?? null,
      termMonths: data.termMonths ?? null,
      notes: data.notes ?? null,
      receivedAt:
        data.status === "received" && !quote.receivedAt
          ? new Date().toISOString()
          : quote.receivedAt,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(lenderQuotes.id, quoteId));

  const submission = await db.query.lenderSubmissions.findFirst({
    where: eq(lenderSubmissions.id, quote.submissionId),
  });

  if (submission) {
    revalidatePath(`/loans/${submission.loanId}`);
  }

  return { success: true };
}
