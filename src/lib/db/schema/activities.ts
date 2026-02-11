import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { contacts } from "./contacts";
import { users } from "./users";

export const ACTIVITY_TYPES = [
  "note_added",
  "email_sent",
  "email_received",
  "call_made",
  "call_received",
  "stage_changed",
  "tag_added",
  "tag_removed",
  "contact_created",
  "contact_updated",
  "score_changed",
  "task_completed",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const activities = sqliteTable("activities", {
  id: text("id").primaryKey(),
  contactId: text("contact_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
  type: text("type", { enum: ACTIVITY_TYPES }).notNull(),
  description: text("description").notNull(),
  metadata: text("metadata", { mode: "json" }),
  userId: text("user_id").references(() => users.id),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});
