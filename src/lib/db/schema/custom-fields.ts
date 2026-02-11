import { sqliteTable, text, primaryKey } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { contacts } from "./contacts";
import { users } from "./users";

export const customFieldDefinitions = sqliteTable("custom_field_definitions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", {
    enum: ["text", "number", "date", "boolean", "select"],
  }).notNull(),
  options: text("options", { mode: "json" }).$type<string[]>(),
  required: text("required").notNull().default("false"),
  ownerId: text("owner_id").references(() => users.id),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const customFieldValues = sqliteTable(
  "custom_field_values",
  {
    contactId: text("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    fieldId: text("field_id")
      .notNull()
      .references(() => customFieldDefinitions.id, { onDelete: "cascade" }),
    value: text("value"),
  },
  (table) => [primaryKey({ columns: [table.contactId, table.fieldId] })]
);
