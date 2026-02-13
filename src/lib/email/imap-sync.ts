import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailAccounts, emails, contacts, activities } from "@/lib/db/schema";
import { decrypt } from "@/lib/crypto";
import type { InferSelectModel } from "drizzle-orm";

type EmailAccount = InferSelectModel<typeof emailAccounts>;

const BATCH_SIZE = 25;

export type SyncResult = {
  synced: number;
  matched: number;
  errors: string[];
};

export async function syncEmailAccount(
  account: EmailAccount,
  userId: string
): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, matched: 0, errors: [] };

  if (!account.imapHost || !account.imapPort || !account.password) {
    result.errors.push("IMAP not configured");
    return result;
  }

  let client: ImapFlow | null = null;

  try {
    client = new ImapFlow({
      host: account.imapHost,
      port: account.imapPort,
      secure: account.imapSecure ?? true,
      auth: {
        user: account.email,
        pass: decrypt(account.password),
      },
      logger: false,
      emitLogs: false,
    });

    await client.connect();

    const lock = await client.getMailboxLock("INBOX");

    try {
      // Search for messages since last sync, or last 7 days
      const sinceDate = account.lastSyncAt
        ? new Date(account.lastSyncAt)
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // ImapFlow types use `false | T` unions; cast via unknown for safety
      const searchResults = (await client.search({
        since: sinceDate,
      })) as unknown as number[];

      if (!searchResults?.length) {
        return result;
      }

      // Take last BATCH_SIZE messages
      const uids = searchResults.slice(-BATCH_SIZE);

      for (const uid of uids) {
        try {
          const rawMessage = await client.fetchOne(uid, {
            source: true,
            envelope: true,
          });

          // fetchOne can return false if message not found
          if (!rawMessage) continue;
          const message = rawMessage as Exclude<typeof rawMessage, false>;
          if (!message.source) continue;

          const parsed = await simpleParser(message.source);

          const messageId =
            parsed.messageId || `<${nanoid()}@synced.local>`;

          // Check for duplicates
          const existing = await db.query.emails.findFirst({
            where: eq(emails.messageId, messageId),
          });
          if (existing) continue;

          // Match sender to contact
          const senderEmail =
            parsed.from?.value?.[0]?.address?.toLowerCase() || "";
          const senderName = parsed.from?.value?.[0]?.name || null;

          let contactId: string | null = null;
          if (senderEmail) {
            const contact = await db.query.contacts.findFirst({
              where: eq(contacts.email, senderEmail),
            });
            if (contact) {
              contactId = contact.id;
              result.matched++;
            }
          }

          // Build recipient lists
          const toList = (parsed.to
            ? Array.isArray(parsed.to)
              ? parsed.to
              : [parsed.to]
            : []
          ).flatMap((addr) =>
            addr.value.map((v) => ({
              email: v.address || "",
              name: v.name || "",
            }))
          );

          const ccList = (parsed.cc
            ? Array.isArray(parsed.cc)
              ? parsed.cc
              : [parsed.cc]
            : []
          ).flatMap((addr) =>
            addr.value.map((v) => ({
              email: v.address || "",
              name: v.name || "",
            }))
          );

          const htmlStr = typeof parsed.html === "string" ? parsed.html : "";
          const bodyText =
            parsed.text || htmlStr.replace(/<[^>]*>/g, "") || "";
          const snippet = bodyText.slice(0, 200);

          const id = nanoid();

          await db.insert(emails).values({
            id,
            accountId: account.id,
            messageId,
            inReplyTo: (typeof parsed.inReplyTo === "string" ? parsed.inReplyTo : null),
            direction: "inbound",
            status: "delivered",
            fromEmail: senderEmail,
            fromName: senderName,
            toEmails: JSON.stringify(toList),
            ccEmails: ccList.length ? JSON.stringify(ccList) : null,
            subject: parsed.subject || null,
            bodyHtml: htmlStr || null,
            bodyText: bodyText || null,
            snippet,
            isRead: false,
            contactId,
            userId,
            receivedAt: parsed.date?.toISOString() || new Date().toISOString(),
          });

          // Log activity for matched contacts
          if (contactId) {
            await db.insert(activities).values({
              id: nanoid(),
              contactId,
              type: "email_received",
              description: `Email received: ${parsed.subject || "(no subject)"}`,
              userId,
            });
          }

          result.synced++;
        } catch (msgErr) {
          result.errors.push(
            `Failed to process message ${uid}: ${msgErr instanceof Error ? msgErr.message : String(msgErr)}`
          );
        }
      }
    } finally {
      lock.release();
    }

    // Update lastSyncAt
    await db
      .update(emailAccounts)
      .set({
        lastSyncAt: new Date().toISOString(),
        syncError: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(emailAccounts.id, account.id));
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : "Unknown IMAP error";
    result.errors.push(errorMsg);

    // Record sync error on account
    await db
      .update(emailAccounts)
      .set({
        syncError: errorMsg,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(emailAccounts.id, account.id));
  } finally {
    if (client) {
      try {
        await client.logout();
      } catch {
        // ignore logout errors
      }
    }
  }

  return result;
}
