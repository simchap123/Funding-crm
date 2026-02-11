import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { contacts } from "./contacts";
import { loans } from "./loans";
import { users } from "./users";

export const FOLLOW_UP_TYPES = [
  "call",
  "email",
  "meeting",
  "task",
  "reminder",
] as const;

export type FollowUpType = (typeof FOLLOW_UP_TYPES)[number];

export const FOLLOW_UP_STATUSES = [
  "scheduled",
  "completed",
  "cancelled",
  "overdue",
] as const;

export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];

export const followUps = sqliteTable("follow_ups", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type", { enum: FOLLOW_UP_TYPES }).notNull().default("reminder"),
  status: text("status", { enum: FOLLOW_UP_STATUSES })
    .notNull()
    .default("scheduled"),
  dueDate: text("due_date").notNull(), // ISO date string YYYY-MM-DD
  dueTime: text("due_time"), // HH:mm format, nullable for all-day
  contactId: text("contact_id").references(() => contacts.id, {
    onDelete: "cascade",
  }),
  loanId: text("loan_id").references(() => loans.id, {
    onDelete: "set null",
  }),
  ownerId: text("owner_id").references(() => users.id),
  completedAt: text("completed_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});
