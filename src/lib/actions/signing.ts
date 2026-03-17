"use server";

import { nanoid } from "nanoid";
import { eq, and, desc, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  documentRecipients,
  signingVerificationCodes,
  emailAccounts,
} from "@/lib/db/schema";
import { sendEmailViaSMTP } from "@/lib/email/smtp-send";
import { verificationCodeEmail } from "@/lib/email/signing-emails";

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function requestVerificationCode(accessToken: string, email: string) {
  // Find recipient by token
  const recipient = await db.query.documentRecipients.findFirst({
    where: eq(documentRecipients.accessToken, accessToken),
    with: { document: true },
  });

  if (!recipient) return { error: "Invalid link" };

  // Check email matches (case-insensitive)
  if (recipient.email.toLowerCase() !== email.toLowerCase()) {
    return { error: "This email doesn't match the recipient for this document" };
  }

  // Rate limit: check last code created
  const lastCode = await db.query.signingVerificationCodes.findFirst({
    where: eq(signingVerificationCodes.recipientId, recipient.id),
    orderBy: [desc(signingVerificationCodes.createdAt)],
  });

  if (lastCode) {
    const elapsed = Date.now() - new Date(lastCode.createdAt).getTime();
    if (elapsed < 60000) {
      return { error: "Please wait 60 seconds before requesting a new code" };
    }
  }

  // Generate and store code
  const code = generateCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await db.insert(signingVerificationCodes).values({
    id: nanoid(),
    recipientId: recipient.id,
    code,
    expiresAt,
  });

  // Send code via email — use the most recently synced active account without errors
  const account = await db.query.emailAccounts.findFirst({
    where: and(
      eq(emailAccounts.isActive, true),
      isNull(emailAccounts.syncError),
    ),
    orderBy: [desc(emailAccounts.lastSyncAt)],
  });

  if (!account) {
    console.error("[CRM] No active email account configured — verification code not sent");
    return { success: true, email: recipient.email, warning: "No email account configured. Code stored but not sent." };
  }

  try {
    const emailContent = verificationCodeEmail({
      recipientName: recipient.name,
      documentTitle: (recipient as any).document.title,
      code,
    });
    await sendEmailViaSMTP(account, {
      to: [recipient.email],
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });
    console.log(`[CRM] Verification code sent to ${recipient.email}`);
  } catch (err) {
    console.error("[CRM] Failed to send verification code email:", err);
    return { success: true, email: recipient.email, warning: "Failed to send email. Please check SMTP settings." };
  }

  return { success: true, email: recipient.email };
}

export async function verifyCode(accessToken: string, code: string) {
  const recipient = await db.query.documentRecipients.findFirst({
    where: eq(documentRecipients.accessToken, accessToken),
  });

  if (!recipient) return { error: "Invalid link" };

  // Find matching unexpired code for this recipient
  const storedCode = await db.query.signingVerificationCodes.findFirst({
    where: eq(signingVerificationCodes.recipientId, recipient.id),
    orderBy: [desc(signingVerificationCodes.createdAt)],
  });

  if (!storedCode || storedCode.code !== code || storedCode.verified) {
    return { error: "Invalid code" };
  }

  if (new Date(storedCode.expiresAt) < new Date()) {
    return { error: "Code has expired. Please request a new one." };
  }

  // Mark as verified
  await db
    .update(signingVerificationCodes)
    .set({ verified: true })
    .where(eq(signingVerificationCodes.id, storedCode.id));

  return { success: true, recipientId: recipient.id };
}
