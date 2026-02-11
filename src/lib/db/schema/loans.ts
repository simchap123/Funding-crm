import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { contacts } from "./contacts";
import { users } from "./users";

export const LOAN_STAGES = [
  "application",
  "processing",
  "underwriting",
  "conditional_approval",
  "approved",
  "closing",
  "funded",
  "denied",
  "withdrawn",
] as const;

export type LoanStage = (typeof LOAN_STAGES)[number];

export const LOAN_TYPES = [
  "conventional",
  "fha",
  "va",
  "usda",
  "jumbo",
  "heloc",
  "refinance",
  "construction",
  "commercial",
  "personal",
  "auto",
  "other",
] as const;

export type LoanType = (typeof LOAN_TYPES)[number];

export const loans = sqliteTable("loans", {
  id: text("id").primaryKey(),
  contactId: text("contact_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
  loanType: text("loan_type", { enum: LOAN_TYPES }).notNull(),
  stage: text("stage", { enum: LOAN_STAGES }).notNull().default("application"),
  amount: real("amount"),
  interestRate: real("interest_rate"),
  termMonths: integer("term_months"),
  propertyAddress: text("property_address"),
  propertyCity: text("property_city"),
  propertyState: text("property_state"),
  propertyZip: text("property_zip"),
  estimatedValue: real("estimated_value"),
  downPayment: real("down_payment"),
  creditScore: integer("credit_score"),
  annualIncome: real("annual_income"),
  debtToIncomeRatio: real("dti_ratio"),
  lender: text("lender"),
  loanNumber: text("loan_number"),
  closingDate: text("closing_date"),
  notes: text("notes"),
  ownerId: text("owner_id").references(() => users.id),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const loanActivities = sqliteTable("loan_activities", {
  id: text("id").primaryKey(),
  loanId: text("loan_id")
    .notNull()
    .references(() => loans.id, { onDelete: "cascade" }),
  type: text("type", {
    enum: [
      "stage_changed",
      "document_requested",
      "document_received",
      "document_sent",
      "note_added",
      "rate_locked",
      "appraisal_ordered",
      "appraisal_received",
      "closing_scheduled",
      "funded",
      "condition_added",
      "condition_cleared",
    ],
  }).notNull(),
  description: text("description").notNull(),
  metadata: text("metadata", { mode: "json" }),
  userId: text("user_id").references(() => users.id),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const loanConditions = sqliteTable("loan_conditions", {
  id: text("id").primaryKey(),
  loanId: text("loan_id")
    .notNull()
    .references(() => loans.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", {
    enum: ["pending", "received", "approved", "waived"],
  })
    .notNull()
    .default("pending"),
  dueDate: text("due_date"),
  clearedAt: text("cleared_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});
