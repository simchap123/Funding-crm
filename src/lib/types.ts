import type { InferSelectModel } from "drizzle-orm";
import type {
  contacts,
  tags,
  notes,
  activities,
  users,
  loans,
  loanActivities,
  loanConditions,
  documents,
  documentRecipients,
  documentFields,
  documentAttachments,
  documentAuditLog,
  emailAccounts,
  emails,
  emailAttachments,
} from "@/lib/db/schema";

export type User = InferSelectModel<typeof users>;
export type Contact = InferSelectModel<typeof contacts>;
export type Tag = InferSelectModel<typeof tags>;
export type Note = InferSelectModel<typeof notes>;
export type Activity = InferSelectModel<typeof activities>;

export type ContactWithTags = Contact & {
  contactTags: { tag: Tag }[];
};

export type ContactWithDetails = Contact & {
  contactTags: { tag: Tag }[];
  notes: Note[];
  activities: Activity[];
  owner: User | null;
};

export type SearchParams = {
  q?: string;
  stage?: string;
  tag?: string;
  source?: string;
  page?: string;
  sort?: string;
  order?: string;
};

// Loan types
export type Loan = InferSelectModel<typeof loans>;
export type LoanActivity = InferSelectModel<typeof loanActivities>;
export type LoanCondition = InferSelectModel<typeof loanConditions>;

export type LoanWithContact = Loan & {
  contact: Contact;
};

export type LoanWithDetails = Loan & {
  contact: ContactWithTags;
  loanActivities: LoanActivity[];
  conditions: LoanCondition[];
  documents: Document[];
};

// Document types
export type Document = InferSelectModel<typeof documents>;
export type DocumentRecipient = InferSelectModel<typeof documentRecipients>;
export type DocumentField = InferSelectModel<typeof documentFields>;
export type DocumentAttachment = InferSelectModel<typeof documentAttachments>;
export type DocumentAuditEntry = InferSelectModel<typeof documentAuditLog>;

export type DocumentWithRecipients = Document & {
  recipients: DocumentRecipient[];
  attachments: DocumentAttachment[];
  fields: DocumentField[];
};

export type DocumentWithDetails = Document & {
  recipients: (DocumentRecipient & { fields: DocumentField[] })[];
  attachments: (DocumentAttachment & { fields: DocumentField[] })[];
  fields: DocumentField[];
  auditLog: DocumentAuditEntry[];
  contact: Contact | null;
  loan: Loan | null;
};

// Email types
export type EmailAccount = InferSelectModel<typeof emailAccounts>;
export type Email = InferSelectModel<typeof emails>;
export type EmailAttachment = InferSelectModel<typeof emailAttachments>;

export type EmailWithAttachments = Email & {
  attachments: EmailAttachment[];
  contact: Contact | null;
};
