import { z } from "zod";

export const documentFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  contactId: z.string().optional(),
  loanId: z.string().optional(),
  message: z.string().optional(),
});

export type DocumentFormValues = z.infer<typeof documentFormSchema>;

export const recipientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  role: z.enum(["signer", "cc", "viewer", "approver"]).default("signer"),
  order: z.number().int().min(1).default(1),
});

export type RecipientFormValues = z.infer<typeof recipientSchema>;

export const signatureFieldSchema = z.object({
  type: z.enum([
    "signature",
    "initials",
    "date",
    "text",
    "checkbox",
    "name",
    "email",
    "company",
    "title",
  ]),
  recipientId: z.string().min(1),
  page: z.number().int().min(1).default(1),
  xPercent: z.number().min(0).max(100),
  yPercent: z.number().min(0).max(100),
  widthPercent: z.number().min(0).max(100),
  heightPercent: z.number().min(0).max(100),
  label: z.string().optional(),
  required: z.boolean().default(true),
});

export type SignatureFieldFormValues = z.infer<typeof signatureFieldSchema>;
