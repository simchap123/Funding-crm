"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  emailAccounts,
  emails,
  contacts,
  activities,
} from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { encrypt, decrypt } from "@/lib/crypto";
import { sendEmailViaSMTP } from "@/lib/email/smtp-send";
import type {
  EmailAccountFormValues,
  ComposeEmailFormValues,
} from "@/lib/validators/emails";
import {
  emailAccountSchema,
  composeEmailSchema,
} from "@/lib/validators/emails";

async function getCurrentUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function createEmailAccount(data: EmailAccountFormValues) {
  const userId = await getCurrentUserId();
  const validated = emailAccountSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.issues[0].message };
  }

  const id = nanoid();
  await db.insert(emailAccounts).values({
    id,
    userId,
    email: validated.data.email,
    name: validated.data.name || null,
    imapHost: validated.data.imapHost,
    imapPort: validated.data.imapPort,
    imapSecure: validated.data.imapSecure,
    smtpHost: validated.data.smtpHost,
    smtpPort: validated.data.smtpPort,
    smtpSecure: validated.data.smtpSecure,
    password: encrypt(validated.data.password),
  });

  revalidatePath("/settings/email");
  revalidatePath("/inbox");

  return { success: true, id };
}

export async function deleteEmailAccount(id: string) {
  await getCurrentUserId();
  await db.delete(emailAccounts).where(eq(emailAccounts.id, id));

  revalidatePath("/settings/email");
  revalidatePath("/inbox");

  return { success: true };
}

export async function composeEmail(data: ComposeEmailFormValues) {
  const userId = await getCurrentUserId();
  const validated = composeEmailSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.issues[0].message };
  }

  const account = await db.query.emailAccounts.findFirst({
    where: eq(emailAccounts.id, validated.data.accountId),
  });
  if (!account) return { error: "Email account not found" };

  // Parse recipients
  const toList = validated.data.to
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  const ccList = validated.data.cc
    ? validated.data.cc
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean)
    : [];

  const bccList = validated.data.bcc
    ? validated.data.bcc
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean)
    : [];

  const bodyText = validated.data.bodyHtml.replace(/<[^>]*>/g, "");

  // Actually send via SMTP
  let smtpMessageId: string | null = null;
  let status: "sent" | "failed" = "sent";
  try {
    const result = await sendEmailViaSMTP(account, {
      to: toList,
      cc: ccList.length ? ccList : undefined,
      bcc: bccList.length ? bccList : undefined,
      subject: validated.data.subject,
      html: validated.data.bodyHtml,
      text: bodyText,
    });
    smtpMessageId = result.messageId;
  } catch (err) {
    status = "failed";
    console.error("[CRM] SMTP send failed:", err);
    return {
      error: `Failed to send: ${err instanceof Error ? err.message : "SMTP error"}`,
    };
  }

  const id = nanoid();

  await db.insert(emails).values({
    id,
    accountId: account.id,
    messageId: smtpMessageId || `<${id}@crm.local>`,
    direction: "outbound",
    status,
    fromEmail: account.email,
    fromName: account.name || undefined,
    toEmails: JSON.stringify(toList.map((e) => ({ email: e }))),
    ccEmails: ccList.length
      ? JSON.stringify(ccList.map((e) => ({ email: e })))
      : null,
    bccEmails: bccList.length
      ? JSON.stringify(bccList.map((e) => ({ email: e })))
      : null,
    subject: validated.data.subject,
    bodyHtml: validated.data.bodyHtml,
    bodyText,
    snippet: bodyText.slice(0, 200),
    isRead: true,
    contactId: validated.data.contactId || null,
    userId,
    sentAt: new Date().toISOString(),
  });

  // Auto-link to contact if email matches
  if (!validated.data.contactId) {
    for (const to of toList) {
      const contact = await db.query.contacts.findFirst({
        where: eq(contacts.email, to),
      });
      if (contact) {
        await db
          .update(emails)
          .set({ contactId: contact.id })
          .where(eq(emails.id, id));

        await db.insert(activities).values({
          id: nanoid(),
          contactId: contact.id,
          type: "email_sent",
          description: `Email sent: ${validated.data.subject}`,
          userId,
        });
        break;
      }
    }
  }

  revalidatePath("/inbox");
  return { success: true, id };
}

export async function markEmailRead(emailId: string) {
  await getCurrentUserId();
  await db
    .update(emails)
    .set({ isRead: true, updatedAt: new Date().toISOString() })
    .where(eq(emails.id, emailId));

  revalidatePath("/inbox");
  return { success: true };
}

export async function markEmailStarred(emailId: string, starred: boolean) {
  await getCurrentUserId();
  await db
    .update(emails)
    .set({ isStarred: starred, updatedAt: new Date().toISOString() })
    .where(eq(emails.id, emailId));

  revalidatePath("/inbox");
  return { success: true };
}

export async function archiveEmail(emailId: string) {
  await getCurrentUserId();
  await db
    .update(emails)
    .set({ isArchived: true, updatedAt: new Date().toISOString() })
    .where(eq(emails.id, emailId));

  revalidatePath("/inbox");
  return { success: true };
}

export async function deleteEmail(emailId: string) {
  await getCurrentUserId();
  await db.delete(emails).where(eq(emails.id, emailId));

  revalidatePath("/inbox");
  return { success: true };
}

export async function createContactFromEmail(emailId: string) {
  const userId = await getCurrentUserId();

  const email = await db.query.emails.findFirst({
    where: eq(emails.id, emailId),
  });
  if (!email) return { error: "Email not found" };
  if (email.contactId) return { error: "Email already linked to a contact" };

  const senderEmail = email.fromEmail;
  if (!senderEmail) return { error: "No sender email" };

  // Check if contact already exists with this email
  const existing = await db.query.contacts.findFirst({
    where: eq(contacts.email, senderEmail),
  });
  if (existing) {
    // Link this and all emails from this sender
    await db
      .update(emails)
      .set({ contactId: existing.id })
      .where(eq(emails.fromEmail, senderEmail));

    revalidatePath("/inbox");
    revalidatePath("/contacts");
    return { success: true, contactId: existing.id, existed: true };
  }

  // Create new contact
  const contactId = nanoid();
  const nameParts = (email.fromName || senderEmail.split("@")[0]).split(" ");
  const firstName = nameParts[0] || "Unknown";
  const lastName = nameParts.slice(1).join(" ") || "";

  await db.insert(contacts).values({
    id: contactId,
    firstName,
    lastName,
    email: senderEmail,
    source: "email_campaign",
    stage: "new",
    ownerId: userId,
  });

  // Link all emails from this sender to the new contact
  await db
    .update(emails)
    .set({ contactId })
    .where(eq(emails.fromEmail, senderEmail));

  await db.insert(activities).values({
    id: nanoid(),
    contactId,
    type: "contact_created",
    description: `Contact created from email: ${email.subject || "(no subject)"}`,
    userId,
  });

  revalidatePath("/inbox");
  revalidatePath("/contacts");
  revalidatePath("/dashboard");
  return { success: true, contactId, existed: false };
}

// Simulate receiving an email (in production this would be IMAP sync)
export async function simulateIncomingEmail(data: {
  accountId: string;
  fromEmail: string;
  fromName?: string;
  subject: string;
  bodyHtml: string;
}) {
  const userId = await getCurrentUserId();

  const id = nanoid();
  const messageId = `<${id}@incoming.local>`;

  // Auto-link to contact
  let contactId: string | null = null;
  const contact = await db.query.contacts.findFirst({
    where: eq(contacts.email, data.fromEmail),
  });

  if (contact) {
    contactId = contact.id;
  }

  await db.insert(emails).values({
    id,
    accountId: data.accountId,
    messageId,
    direction: "inbound",
    status: "delivered",
    fromEmail: data.fromEmail,
    fromName: data.fromName || null,
    toEmails: JSON.stringify([]),
    subject: data.subject,
    bodyHtml: data.bodyHtml,
    bodyText: data.bodyHtml.replace(/<[^>]*>/g, ""),
    snippet: data.bodyHtml.replace(/<[^>]*>/g, "").slice(0, 200),
    isRead: false,
    contactId,
    userId,
    receivedAt: new Date().toISOString(),
  });

  // Auto-create lead if no matching contact
  if (!contactId) {
    const newContactId = nanoid();
    const nameParts = (data.fromName || data.fromEmail.split("@")[0]).split(
      " "
    );
    const firstName = nameParts[0] || "Unknown";
    const lastName = nameParts.slice(1).join(" ") || "";

    await db.insert(contacts).values({
      id: newContactId,
      firstName,
      lastName,
      email: data.fromEmail,
      source: "email_campaign",
      stage: "new",
      ownerId: userId,
    });

    // Link the email to the new contact
    await db
      .update(emails)
      .set({ contactId: newContactId, leadCreated: true })
      .where(eq(emails.id, id));

    await db.insert(activities).values({
      id: nanoid(),
      contactId: newContactId,
      type: "contact_created",
      description: "Lead auto-created from incoming email",
      userId,
    });

    await db.insert(activities).values({
      id: nanoid(),
      contactId: newContactId,
      type: "email_received",
      description: `Email received: ${data.subject}`,
      userId,
    });

    revalidatePath("/contacts");
    revalidatePath("/dashboard");
  } else {
    await db.insert(activities).values({
      id: nanoid(),
      contactId,
      type: "email_received",
      description: `Email received: ${data.subject}`,
      userId,
    });
  }

  revalidatePath("/inbox");
  return { success: true, id, leadCreated: !contactId };
}
