import { relations } from "drizzle-orm";
import { users } from "./users";
import { contacts } from "./contacts";
import { tags, contactTags } from "./tags";
import { notes } from "./notes";
import { activities } from "./activities";
import { customFieldDefinitions, customFieldValues } from "./custom-fields";
import { loans, loanActivities, loanConditions } from "./loans";
import {
  documents,
  documentRecipients,
  documentFields,
  documentAttachments,
  documentAuditLog,
} from "./documents";
import { emailAccounts, emails, emailAttachments } from "./emails";
import { followUps } from "./follow-ups";
import { lenders, lenderSubmissions, lenderQuotes } from "./lenders";

export const usersRelations = relations(users, ({ many }) => ({
  contacts: many(contacts),
  notes: many(notes),
  activities: many(activities),
  tags: many(tags),
  emailAccounts: many(emailAccounts),
  emails: many(emails),
  followUps: many(followUps),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  owner: one(users, {
    fields: [contacts.ownerId],
    references: [users.id],
  }),
  contactTags: many(contactTags),
  notes: many(notes),
  activities: many(activities),
  customFieldValues: many(customFieldValues),
  loans: many(loans),
  documents: many(documents),
  emails: many(emails),
  followUps: many(followUps),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  owner: one(users, {
    fields: [tags.ownerId],
    references: [users.id],
  }),
  contactTags: many(contactTags),
}));

export const contactTagsRelations = relations(contactTags, ({ one }) => ({
  contact: one(contacts, {
    fields: [contactTags.contactId],
    references: [contacts.id],
  }),
  tag: one(tags, {
    fields: [contactTags.tagId],
    references: [tags.id],
  }),
}));

export const notesRelations = relations(notes, ({ one }) => ({
  contact: one(contacts, {
    fields: [notes.contactId],
    references: [contacts.id],
  }),
  author: one(users, {
    fields: [notes.authorId],
    references: [users.id],
  }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  contact: one(contacts, {
    fields: [activities.contactId],
    references: [contacts.id],
  }),
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
}));

export const customFieldDefinitionsRelations = relations(
  customFieldDefinitions,
  ({ one, many }) => ({
    owner: one(users, {
      fields: [customFieldDefinitions.ownerId],
      references: [users.id],
    }),
    values: many(customFieldValues),
  })
);

export const customFieldValuesRelations = relations(
  customFieldValues,
  ({ one }) => ({
    contact: one(contacts, {
      fields: [customFieldValues.contactId],
      references: [contacts.id],
    }),
    field: one(customFieldDefinitions, {
      fields: [customFieldValues.fieldId],
      references: [customFieldDefinitions.id],
    }),
  })
);

// Loans relations
export const loansRelations = relations(loans, ({ one, many }) => ({
  contact: one(contacts, {
    fields: [loans.contactId],
    references: [contacts.id],
  }),
  owner: one(users, {
    fields: [loans.ownerId],
    references: [users.id],
  }),
  loanActivities: many(loanActivities),
  conditions: many(loanConditions),
  documents: many(documents),
  lenderSubmissions: many(lenderSubmissions),
}));

export const loanActivitiesRelations = relations(
  loanActivities,
  ({ one }) => ({
    loan: one(loans, {
      fields: [loanActivities.loanId],
      references: [loans.id],
    }),
    user: one(users, {
      fields: [loanActivities.userId],
      references: [users.id],
    }),
  })
);

export const loanConditionsRelations = relations(
  loanConditions,
  ({ one }) => ({
    loan: one(loans, {
      fields: [loanConditions.loanId],
      references: [loans.id],
    }),
  })
);

// Documents relations
export const documentsRelations = relations(documents, ({ one, many }) => ({
  contact: one(contacts, {
    fields: [documents.contactId],
    references: [contacts.id],
  }),
  loan: one(loans, {
    fields: [documents.loanId],
    references: [loans.id],
  }),
  owner: one(users, {
    fields: [documents.ownerId],
    references: [users.id],
  }),
  recipients: many(documentRecipients),
  attachments: many(documentAttachments),
  fields: many(documentFields),
  auditLog: many(documentAuditLog),
}));

export const documentRecipientsRelations = relations(
  documentRecipients,
  ({ one, many }) => ({
    document: one(documents, {
      fields: [documentRecipients.documentId],
      references: [documents.id],
    }),
    contact: one(contacts, {
      fields: [documentRecipients.contactId],
      references: [contacts.id],
    }),
    fields: many(documentFields),
  })
);

export const documentAttachmentsRelations = relations(
  documentAttachments,
  ({ one, many }) => ({
    document: one(documents, {
      fields: [documentAttachments.documentId],
      references: [documents.id],
    }),
    fields: many(documentFields),
  })
);

export const documentFieldsRelations = relations(
  documentFields,
  ({ one }) => ({
    document: one(documents, {
      fields: [documentFields.documentId],
      references: [documents.id],
    }),
    recipient: one(documentRecipients, {
      fields: [documentFields.recipientId],
      references: [documentRecipients.id],
    }),
    attachment: one(documentAttachments, {
      fields: [documentFields.attachmentId],
      references: [documentAttachments.id],
    }),
  })
);

export const documentAuditLogRelations = relations(
  documentAuditLog,
  ({ one }) => ({
    document: one(documents, {
      fields: [documentAuditLog.documentId],
      references: [documents.id],
    }),
  })
);

// Email relations
export const emailAccountsRelations = relations(
  emailAccounts,
  ({ one, many }) => ({
    user: one(users, {
      fields: [emailAccounts.userId],
      references: [users.id],
    }),
    emails: many(emails),
  })
);

export const emailsRelations = relations(emails, ({ one, many }) => ({
  account: one(emailAccounts, {
    fields: [emails.accountId],
    references: [emailAccounts.id],
  }),
  contact: one(contacts, {
    fields: [emails.contactId],
    references: [contacts.id],
  }),
  user: one(users, {
    fields: [emails.userId],
    references: [users.id],
  }),
  attachments: many(emailAttachments),
}));

export const emailAttachmentsRelations = relations(
  emailAttachments,
  ({ one }) => ({
    email: one(emails, {
      fields: [emailAttachments.emailId],
      references: [emails.id],
    }),
  })
);

// Follow-ups relations
export const followUpsRelations = relations(followUps, ({ one }) => ({
  contact: one(contacts, {
    fields: [followUps.contactId],
    references: [contacts.id],
  }),
  loan: one(loans, {
    fields: [followUps.loanId],
    references: [loans.id],
  }),
  owner: one(users, {
    fields: [followUps.ownerId],
    references: [users.id],
  }),
}));

// Lender relations
export const lendersRelations = relations(lenders, ({ one, many }) => ({
  owner: one(users, {
    fields: [lenders.ownerId],
    references: [users.id],
  }),
  quotes: many(lenderQuotes),
}));

export const lenderSubmissionsRelations = relations(
  lenderSubmissions,
  ({ one, many }) => ({
    loan: one(loans, {
      fields: [lenderSubmissions.loanId],
      references: [loans.id],
    }),
    email: one(emails, {
      fields: [lenderSubmissions.emailId],
      references: [emails.id],
    }),
    owner: one(users, {
      fields: [lenderSubmissions.ownerId],
      references: [users.id],
    }),
    quotes: many(lenderQuotes),
  })
);

export const lenderQuotesRelations = relations(lenderQuotes, ({ one }) => ({
  submission: one(lenderSubmissions, {
    fields: [lenderQuotes.submissionId],
    references: [lenderSubmissions.id],
  }),
  lender: one(lenders, {
    fields: [lenderQuotes.lenderId],
    references: [lenders.id],
  }),
}));
