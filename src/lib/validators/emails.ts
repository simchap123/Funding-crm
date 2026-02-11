import { z } from "zod";

export const emailAccountSchema = z.object({
  email: z.string().email("Valid email is required"),
  name: z.string().optional(),
  imapHost: z.string().min(1, "IMAP host is required"),
  imapPort: z.number().int().positive().default(993),
  imapSecure: z.boolean().default(true),
  smtpHost: z.string().min(1, "SMTP host is required"),
  smtpPort: z.number().int().positive().default(587),
  smtpSecure: z.boolean().default(true),
  password: z.string().min(1, "Password is required"),
});

export type EmailAccountFormValues = z.infer<typeof emailAccountSchema>;

export const composeEmailSchema = z.object({
  accountId: z.string().min(1, "Select an account"),
  to: z.string().min(1, "Recipient is required"),
  cc: z.string().optional(),
  bcc: z.string().optional(),
  subject: z.string().min(1, "Subject is required"),
  bodyHtml: z.string().min(1, "Message body is required"),
  contactId: z.string().optional(),
});

export type ComposeEmailFormValues = z.infer<typeof composeEmailSchema>;
