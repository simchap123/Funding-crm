import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { loans } from "./loans";
import { emails } from "./emails";

export const lenders = sqliteTable("lenders", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company"),
  phone: text("phone"),
  notes: text("notes"),
  submissionGuidelines: text("submission_guidelines"),
  ownerId: text("owner_id").references(() => users.id),
  sortOrder: integer("sort_order").default(0),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const lenderSubmissions = sqliteTable("lender_submissions", {
  id: text("id").primaryKey(),
  loanId: text("loan_id")
    .notNull()
    .references(() => loans.id, { onDelete: "cascade" }),
  emailId: text("email_id").references(() => emails.id, {
    onDelete: "set null",
  }),
  subject: text("subject"),
  message: text("message"),
  lenderIds: text("lender_ids").notNull(), // JSON array of lender ids
  lenderEmails: text("lender_emails").notNull(), // JSON array — denormalized
  sentAt: text("sent_at"),
  ownerId: text("owner_id").references(() => users.id),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const QUOTE_STATUSES = ["pending", "received", "declined"] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const lenderQuotes = sqliteTable("lender_quotes", {
  id: text("id").primaryKey(),
  submissionId: text("submission_id")
    .notNull()
    .references(() => lenderSubmissions.id, { onDelete: "cascade" }),
  lenderId: text("lender_id").references(() => lenders.id, {
    onDelete: "set null",
  }),
  lenderName: text("lender_name").notNull(),
  status: text("status", { enum: QUOTE_STATUSES }).notNull().default("pending"),
  rate: real("rate"),
  points: real("points"),
  fees: real("fees"),
  loanAmount: real("loan_amount"),
  termMonths: integer("term_months"),
  notes: text("notes"),
  receivedAt: text("received_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});
