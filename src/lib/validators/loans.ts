import { z } from "zod";
import { LOAN_STAGES, LOAN_TYPES } from "@/lib/db/schema/loans";

export const loanFormSchema = z.object({
  contactId: z.string().min(1, "Contact is required"),
  loanType: z.enum(LOAN_TYPES, { message: "Loan type is required" }),
  stage: z.enum(LOAN_STAGES).default("application"),
  amount: z.number().positive("Amount must be positive").optional(),
  interestRate: z
    .number()
    .min(0, "Rate must be positive")
    .max(100, "Rate too high")
    .optional(),
  termMonths: z
    .number()
    .int()
    .positive("Term must be positive")
    .optional(),
  propertyAddress: z.string().optional(),
  propertyCity: z.string().optional(),
  propertyState: z.string().optional(),
  propertyZip: z.string().optional(),
  estimatedValue: z.number().positive().optional(),
  downPayment: z.number().min(0).optional(),
  creditScore: z.number().int().min(300).max(850).optional(),
  annualIncome: z.number().positive().optional(),
  debtToIncomeRatio: z.number().min(0).max(100).optional(),
  lender: z.string().optional(),
  loanNumber: z.string().optional(),
  closingDate: z.string().optional(),
  notes: z.string().optional(),
});

export type LoanFormValues = z.infer<typeof loanFormSchema>;

export const loanConditionSchema = z.object({
  loanId: z.string().min(1),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  dueDate: z.string().optional(),
});

export type LoanConditionFormValues = z.infer<typeof loanConditionSchema>;
