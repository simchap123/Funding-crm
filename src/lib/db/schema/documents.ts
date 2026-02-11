import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { contacts } from "./contacts";
import { loans } from "./loans";
import { users } from "./users";

export const DOCUMENT_STATUSES = [
  "draft",
  "sent",
  "viewed",
  "partially_signed",
  "completed",
  "declined",
  "expired",
  "voided",
] as const;

export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  // File storage: in production use S3/Supabase Storage, for now store base64 or file path
  fileName: text("file_name"),
  fileUrl: text("file_url"),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  status: text("status", { enum: DOCUMENT_STATUSES })
    .notNull()
    .default("draft"),
  // Optional links to contact/loan
  contactId: text("contact_id").references(() => contacts.id, {
    onDelete: "set null",
  }),
  loanId: text("loan_id").references(() => loans.id, {
    onDelete: "set null",
  }),
  // Template support
  isTemplate: integer("is_template", { mode: "boolean" })
    .notNull()
    .default(false),
  templateId: text("template_id"),
  // Signing settings
  expiresAt: text("expires_at"),
  message: text("message"), // Message to recipients
  sentAt: text("sent_at"),
  completedAt: text("completed_at"),
  ownerId: text("owner_id").references(() => users.id),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const RECIPIENT_ROLES = [
  "signer",
  "cc",
  "viewer",
  "approver",
] as const;

export type RecipientRole = (typeof RECIPIENT_ROLES)[number];

export const RECIPIENT_STATUSES = [
  "pending",
  "sent",
  "viewed",
  "signed",
  "declined",
] as const;

export type RecipientStatus = (typeof RECIPIENT_STATUSES)[number];

export const documentRecipients = sqliteTable("document_recipients", {
  id: text("id").primaryKey(),
  documentId: text("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role", { enum: RECIPIENT_ROLES }).notNull().default("signer"),
  status: text("status", { enum: RECIPIENT_STATUSES })
    .notNull()
    .default("pending"),
  order: integer("order").notNull().default(1),
  // Unique token for signing access
  accessToken: text("access_token").notNull(),
  contactId: text("contact_id").references(() => contacts.id),
  signedAt: text("signed_at"),
  viewedAt: text("viewed_at"),
  declinedAt: text("declined_at"),
  declineReason: text("decline_reason"),
  ipAddress: text("ip_address"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const FIELD_TYPES = [
  "signature",
  "initials",
  "date",
  "text",
  "checkbox",
  "name",
  "email",
  "company",
  "title",
] as const;

export type DocumentFieldType = (typeof FIELD_TYPES)[number];

export const documentFields = sqliteTable("document_fields", {
  id: text("id").primaryKey(),
  documentId: text("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  recipientId: text("recipient_id")
    .notNull()
    .references(() => documentRecipients.id, { onDelete: "cascade" }),
  // Link to specific attachment (signature goes on this file)
  attachmentId: text("attachment_id").references(() => documentAttachments.id, {
    onDelete: "cascade",
  }),
  type: text("type", { enum: FIELD_TYPES }).notNull(),
  label: text("label"),
  required: integer("required", { mode: "boolean" }).notNull().default(true),
  // Position on the document (page within the attachment, x%, y%, width%, height%)
  page: integer("page").notNull().default(1),
  xPercent: real("x_percent").notNull(),
  yPercent: real("y_percent").notNull(),
  widthPercent: real("width_percent").notNull(),
  heightPercent: real("height_percent").notNull(),
  // Filled value
  value: text("value"),
  filledAt: text("filled_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

// Multiple file attachments per document
export const documentAttachments = sqliteTable("document_attachments", {
  id: text("id").primaryKey(),
  documentId: text("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url"), // file path or URL
  fileData: text("file_data"), // base64 for local dev
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  pageCount: integer("page_count").default(1),
  order: integer("order").notNull().default(1),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const documentAuditLog = sqliteTable("document_audit_log", {
  id: text("id").primaryKey(),
  documentId: text("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  action: text("action", {
    enum: [
      "created",
      "sent",
      "viewed",
      "signed",
      "declined",
      "completed",
      "voided",
      "downloaded",
      "field_filled",
    ],
  }).notNull(),
  actorEmail: text("actor_email"),
  actorName: text("actor_name"),
  ipAddress: text("ip_address"),
  metadata: text("metadata", { mode: "json" }),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});
