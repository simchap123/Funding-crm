import { z } from "zod";
import { LEAD_STAGES, LEAD_SOURCES } from "@/lib/db/schema/contacts";

export const contactFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  stage: z.enum(LEAD_STAGES),
  source: z.enum(LEAD_SOURCES).optional(),
  score: z.number().min(0).max(100).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  website: z.string().url("Invalid URL").or(z.literal("")).optional(),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;
