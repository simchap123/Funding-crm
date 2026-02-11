import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { contacts } from "./contacts";
import { users } from "./users";

export const emailAccounts = sqliteTable("email_accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  name: text("name"),
  // IMAP settings
  imapHost: text("imap_host"),
  imapPort: integer("imap_port"),
  imapSecure: integer("imap_secure", { mode: "boolean" }).default(true),
  // SMTP settings
  smtpHost: text("smtp_host"),
  smtpPort: integer("smtp_port"),
  smtpSecure: integer("smtp_secure", { mode: "boolean" }).default(true),
  // Auth (encrypted in production)
  password: text("password"),
  // Sync status
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  lastSyncAt: text("last_sync_at"),
  syncError: text("sync_error"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const EMAIL_DIRECTIONS = ["inbound", "outbound"] as const;
export type EmailDirection = (typeof EMAIL_DIRECTIONS)[number];

export const EMAIL_STATUSES = [
  "draft",
  "queued",
  "sent",
  "delivered",
  "bounced",
  "failed",
] as const;
export type EmailStatus = (typeof EMAIL_STATUSES)[number];

export const emails = sqliteTable("emails", {
  id: text("id").primaryKey(),
  accountId: text("account_id")
    .notNull()
    .references(() => emailAccounts.id, { onDelete: "cascade" }),
  threadId: text("thread_id"),
  messageId: text("message_id"), // RFC message-id header
  inReplyTo: text("in_reply_to"), // Parent message-id
  direction: text("direction", { enum: EMAIL_DIRECTIONS }).notNull(),
  status: text("status", { enum: EMAIL_STATUSES })
    .notNull()
    .default("draft"),
  fromEmail: text("from_email").notNull(),
  fromName: text("from_name"),
  toEmails: text("to_emails").notNull(), // JSON array of {email, name}
  ccEmails: text("cc_emails"), // JSON array
  bccEmails: text("bcc_emails"), // JSON array
  subject: text("subject"),
  bodyHtml: text("body_html"),
  bodyText: text("body_text"),
  snippet: text("snippet"), // First ~200 chars for preview
  // Flags
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  isStarred: integer("is_starred", { mode: "boolean" })
    .notNull()
    .default(false),
  isArchived: integer("is_archived", { mode: "boolean" })
    .notNull()
    .default(false),
  // Link to contact (auto-matched or manual)
  contactId: text("contact_id").references(() => contacts.id, {
    onDelete: "set null",
  }),
  // Link to user who owns this email
  userId: text("user_id").references(() => users.id),
  // Auto-lead creation
  leadCreated: integer("lead_created", { mode: "boolean" })
    .notNull()
    .default(false),
  receivedAt: text("received_at"),
  sentAt: text("sent_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const emailAttachments = sqliteTable("email_attachments", {
  id: text("id").primaryKey(),
  emailId: text("email_id")
    .notNull()
    .references(() => emails.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type"),
  fileSize: integer("file_size"),
  fileUrl: text("file_url"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});
