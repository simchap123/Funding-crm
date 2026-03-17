"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { eq, and, desc, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  documents,
  documentRecipients,
  documentFields,
  documentAttachments,
  documentAuditLog,
  emailAccounts,
} from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { sendEmailViaSMTP } from "@/lib/email/smtp-send";
import { signingInviteEmail } from "@/lib/email/signing-emails";
import type { DocumentFieldType } from "@/lib/db/schema/documents";

async function getCurrentUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

async function verifyDocumentOwner(documentId: string) {
  const userId = await getCurrentUserId();
  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, documentId),
  });
  if (!doc) throw new Error("Document not found");
  if (doc.ownerId !== userId) throw new Error("Access denied");
  return { userId, doc };
}

export async function createDocument(data: {
  title: string;
  description?: string;
  contactId?: string;
  loanId?: string;
  message?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
}) {
  const userId = await getCurrentUserId();

  const id = nanoid();
  await db.insert(documents).values({
    id,
    title: data.title,
    description: data.description || null,
    contactId: data.contactId || null,
    loanId: data.loanId || null,
    message: data.message || null,
    fileName: data.fileName || null,
    fileUrl: data.fileUrl || null,
    fileSize: data.fileSize || null,
    mimeType: data.mimeType || null,
    ownerId: userId,
  });

  await db.insert(documentAuditLog).values({
    id: nanoid(),
    documentId: id,
    action: "created",
    actorName: "System",
  });

  revalidatePath("/documents");
  return { success: true, id };
}

export async function addRecipient(data: {
  documentId: string;
  name: string;
  email: string;
  role?: "signer" | "cc" | "viewer" | "approver";
  order?: number;
  contactId?: string;
}) {
  await verifyDocumentOwner(data.documentId);

  const id = nanoid();
  const accessToken = nanoid(32);

  await db.insert(documentRecipients).values({
    id,
    documentId: data.documentId,
    name: data.name,
    email: data.email,
    role: data.role || "signer",
    order: data.order || 1,
    accessToken,
    contactId: data.contactId || null,
  });

  revalidatePath(`/documents/${data.documentId}`);
  return { success: true, id, accessToken };
}

export async function addAttachment(data: {
  documentId: string;
  fileName: string;
  fileData?: string; // base64
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  pageCount?: number;
  order?: number;
}) {
  await verifyDocumentOwner(data.documentId);

  const id = nanoid();
  await db.insert(documentAttachments).values({
    id,
    documentId: data.documentId,
    fileName: data.fileName,
    fileData: data.fileData || null,
    fileUrl: data.fileUrl || null,
    fileSize: data.fileSize || null,
    mimeType: data.mimeType || null,
    pageCount: data.pageCount || 1,
    order: data.order || 1,
  });

  revalidatePath(`/documents/${data.documentId}`);
  return { success: true, id };
}

export async function removeAttachment(attachmentId: string) {
  const userId = await getCurrentUserId();

  const attachment = await db.query.documentAttachments.findFirst({
    where: eq(documentAttachments.id, attachmentId),
  });
  if (!attachment) return { error: "Attachment not found" };

  // Verify ownership
  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, attachment.documentId),
  });
  if (!doc || doc.ownerId !== userId) return { error: "Access denied" };

  await db
    .delete(documentAttachments)
    .where(eq(documentAttachments.id, attachmentId));

  revalidatePath(`/documents/${attachment.documentId}`);
  return { success: true };
}

export async function addSignatureField(data: {
  documentId: string;
  recipientId: string;
  attachmentId?: string; // which attachment this field is on
  type: DocumentFieldType;
  page: number;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  label?: string;
  required?: boolean;
  sequence?: number;
}) {
  await verifyDocumentOwner(data.documentId);

  if (!data.recipientId) {
    return { error: "A recipient must be selected before placing fields" };
  }

  // Server-side bounds validation
  if (data.xPercent < 0 || data.xPercent > 100) {
    return { error: "xPercent must be between 0 and 100" };
  }
  if (data.yPercent < 0 || data.yPercent > 100) {
    return { error: "yPercent must be between 0 and 100" };
  }
  if (data.widthPercent < 1 || data.widthPercent > 100) {
    return { error: "widthPercent must be between 1 and 100" };
  }
  if (data.heightPercent < 1 || data.heightPercent > 100) {
    return { error: "heightPercent must be between 1 and 100" };
  }
  if (data.page < 1) {
    return { error: "page must be at least 1" };
  }

  // Verify the recipient exists and belongs to this document
  const recipient = await db.query.documentRecipients.findFirst({
    where: eq(documentRecipients.id, data.recipientId),
  });
  if (!recipient) {
    return { error: "Recipient not found" };
  }
  if (recipient.documentId !== data.documentId) {
    return { error: "Recipient does not belong to this document" };
  }

  // Verify the attachment exists and belongs to this document
  if (data.attachmentId) {
    const attachment = await db.query.documentAttachments.findFirst({
      where: eq(documentAttachments.id, data.attachmentId),
    });
    if (!attachment) {
      return { error: "Attachment not found" };
    }
    if (attachment.documentId !== data.documentId) {
      return { error: "Attachment does not belong to this document" };
    }
  }

  const id = nanoid();
  await db.insert(documentFields).values({
    id,
    documentId: data.documentId,
    recipientId: data.recipientId,
    attachmentId: data.attachmentId || null,
    type: data.type,
    page: data.page,
    xPercent: data.xPercent,
    yPercent: data.yPercent,
    widthPercent: data.widthPercent,
    heightPercent: data.heightPercent,
    label: data.label || null,
    required: data.required ?? true,
    sequence: data.sequence ?? null,
  });

  revalidatePath(`/documents/${data.documentId}`);
  return { success: true, id };
}

export async function updateSignatureField(data: {
  fieldId: string;
  xPercent?: number;
  yPercent?: number;
  widthPercent?: number;
  heightPercent?: number;
  label?: string;
  required?: boolean;
}) {
  const field = await db.query.documentFields.findFirst({
    where: eq(documentFields.id, data.fieldId),
  });
  if (!field) return { error: "Field not found" };

  const { doc } = await verifyDocumentOwner(field.documentId);

  // Only allow updates on draft or sent documents
  if (!["draft", "sent"].includes(doc.status)) {
    return { error: "Cannot update fields on a document that is " + doc.status };
  }

  // Bounds validation for provided values
  if (data.xPercent !== undefined && (data.xPercent < 0 || data.xPercent > 100)) {
    return { error: "xPercent must be between 0 and 100" };
  }
  if (data.yPercent !== undefined && (data.yPercent < 0 || data.yPercent > 100)) {
    return { error: "yPercent must be between 0 and 100" };
  }
  if (data.widthPercent !== undefined && (data.widthPercent < 1 || data.widthPercent > 100)) {
    return { error: "widthPercent must be between 1 and 100" };
  }
  if (data.heightPercent !== undefined && (data.heightPercent < 1 || data.heightPercent > 100)) {
    return { error: "heightPercent must be between 1 and 100" };
  }

  // Build update object with only provided fields
  const updates: Record<string, unknown> = {};
  if (data.xPercent !== undefined) updates.xPercent = data.xPercent;
  if (data.yPercent !== undefined) updates.yPercent = data.yPercent;
  if (data.widthPercent !== undefined) updates.widthPercent = data.widthPercent;
  if (data.heightPercent !== undefined) updates.heightPercent = data.heightPercent;
  if (data.label !== undefined) updates.label = data.label;
  if (data.required !== undefined) updates.required = data.required;

  if (Object.keys(updates).length > 0) {
    await db
      .update(documentFields)
      .set(updates)
      .where(eq(documentFields.id, data.fieldId));
  }

  revalidatePath(`/documents/${field.documentId}`);
  return { success: true };
}

export async function deleteSignatureField(fieldId: string) {
  const field = await db.query.documentFields.findFirst({
    where: eq(documentFields.id, fieldId),
  });
  if (!field) return { error: "Field not found" };

  const { doc } = await verifyDocumentOwner(field.documentId);

  // Only allow deletion on draft documents
  if (doc.status !== "draft") {
    return { error: "Fields can only be deleted on draft documents" };
  }

  await db.delete(documentFields).where(eq(documentFields.id, fieldId));

  await db.insert(documentAuditLog).values({
    id: nanoid(),
    documentId: field.documentId,
    action: "field_deleted",
    actorName: "System",
    metadata: JSON.stringify({ fieldType: field.type, fieldId }),
  });

  revalidatePath(`/documents/${field.documentId}`);
  return { success: true };
}

export async function sendDocument(documentId: string) {
  const userId = await getCurrentUserId();

  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, documentId),
    with: { recipients: true },
  });

  if (!doc) return { error: "Document not found" };
  if (doc.ownerId !== userId) return { error: "Access denied" };
  if (doc.recipients.length === 0)
    return { error: "Add at least one recipient" };

  // Ensure at least one field exists before sending
  const fields = await db.query.documentFields.findMany({
    where: eq(documentFields.documentId, documentId),
  });
  if (fields.length === 0)
    return { error: "Add at least one field before sending" };

  // Check that at least one signature-type field exists
  const SIGNATURE_FIELD_TYPES = ["signature", "initials"];
  const hasSignatureField = fields.some((f) =>
    SIGNATURE_FIELD_TYPES.includes(f.type)
  );
  if (!hasSignatureField)
    return { error: "At least one signature or initials field is required" };

  // Check that every signer-role recipient has at least one field assigned
  const signerRecipients = doc.recipients.filter((r) => r.role === "signer");
  for (const signer of signerRecipients) {
    const signerFields = fields.filter((f) => f.recipientId === signer.id);
    if (signerFields.length === 0) {
      return {
        error: `Signer "${signer.name}" (${signer.email}) has no fields assigned`,
      };
    }
  }

  // Update document status
  await db
    .update(documents)
    .set({
      status: "sent",
      sentAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(documents.id, documentId));

  // Update all recipient statuses
  for (const recipient of doc.recipients) {
    await db
      .update(documentRecipients)
      .set({ status: "sent" })
      .where(eq(documentRecipients.id, recipient.id));
  }

  await db.insert(documentAuditLog).values({
    id: nanoid(),
    documentId,
    action: "sent",
    actorName: "System",
    metadata: JSON.stringify({
      recipientCount: doc.recipients.length,
    }),
  });

  // Send signing invite emails — prefer most recently synced account without errors
  const account = await db.query.emailAccounts.findFirst({
    where: and(
      eq(emailAccounts.isActive, true),
      isNull(emailAccounts.syncError),
    ),
    orderBy: [desc(emailAccounts.lastSyncAt)],
  });

  if (account) {
    const session = await auth();
    const senderName = session?.user?.name || "Document Sender";
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    for (const recipient of doc.recipients) {
      try {
        const emailContent = signingInviteEmail({
          recipientName: recipient.name,
          documentTitle: doc.title,
          senderName,
          message: doc.message,
          signingUrl: `${baseUrl}/sign/${recipient.accessToken}`,
        });
        await sendEmailViaSMTP(account, {
          to: [recipient.email],
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });
      } catch (err) {
        console.error(`[CRM] Failed to email recipient ${recipient.email}:`, err);
      }
    }
  }

  revalidatePath(`/documents/${documentId}`);
  revalidatePath("/documents");

  return { success: true };
}

export async function signField(
  fieldId: string,
  value: string,
  accessToken: string
) {
  // Verify access token
  const recipient = await db.query.documentRecipients.findFirst({
    where: eq(documentRecipients.accessToken, accessToken),
  });

  if (!recipient) return { error: "Invalid access token" };

  const field = await db.query.documentFields.findFirst({
    where: eq(documentFields.id, fieldId),
  });

  if (!field) return { error: "Field not found" };
  if (field.recipientId !== recipient.id)
    return { error: "This field is not assigned to you" };

  await db
    .update(documentFields)
    .set({
      value,
      filledAt: new Date().toISOString(),
    })
    .where(eq(documentFields.id, fieldId));

  // Check if all required fields for this recipient are filled
  const allFields = await db.query.documentFields.findMany({
    where: eq(documentFields.recipientId, recipient.id),
  });

  const allRequiredFilled = allFields
    .filter((f) => f.required)
    .every((f) => f.value || f.id === fieldId);

  if (allRequiredFilled) {
    // Mark recipient as signed
    await db
      .update(documentRecipients)
      .set({
        status: "signed",
        signedAt: new Date().toISOString(),
      })
      .where(eq(documentRecipients.id, recipient.id));

    // Check if all signers have signed
    const doc = await db.query.documents.findFirst({
      where: eq(documents.id, field.documentId),
      with: { recipients: true },
    });

    if (doc) {
      const allSigners = doc.recipients.filter((r) => r.role === "signer");
      const allSigned = allSigners.every(
        (r) => r.status === "signed" || r.id === recipient.id
      );

      if (allSigned) {
        await db
          .update(documents)
          .set({
            status: "completed",
            completedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(documents.id, field.documentId));

        await db.insert(documentAuditLog).values({
          id: nanoid(),
          documentId: field.documentId,
          action: "completed",
          actorEmail: recipient.email,
          actorName: recipient.name,
        });
      } else {
        await db
          .update(documents)
          .set({
            status: "partially_signed",
            updatedAt: new Date().toISOString(),
          })
          .where(eq(documents.id, field.documentId));
      }
    }

    await db.insert(documentAuditLog).values({
      id: nanoid(),
      documentId: field.documentId,
      action: "signed",
      actorEmail: recipient.email,
      actorName: recipient.name,
    });
  } else {
    await db.insert(documentAuditLog).values({
      id: nanoid(),
      documentId: field.documentId,
      action: "field_filled",
      actorEmail: recipient.email,
      actorName: recipient.name,
      metadata: JSON.stringify({ fieldType: field.type }),
    });
  }

  revalidatePath(`/documents/${field.documentId}`);
  return { success: true };
}

export async function signAllFields(
  accessToken: string,
  fieldValues: Array<{ fieldId: string; value: string }>
) {
  // Verify access token
  const recipient = await db.query.documentRecipients.findFirst({
    where: eq(documentRecipients.accessToken, accessToken),
  });
  if (!recipient) return { error: "Invalid access token" };

  if (fieldValues.length === 0) return { error: "No field values provided" };

  // Get all fields for this recipient
  const recipientFields = await db.query.documentFields.findMany({
    where: eq(documentFields.recipientId, recipient.id),
  });
  const recipientFieldIds = new Set(recipientFields.map((f) => f.id));

  // Verify all provided fields belong to this recipient
  for (const fv of fieldValues) {
    if (!recipientFieldIds.has(fv.fieldId)) {
      return { error: `Field ${fv.fieldId} is not assigned to you` };
    }
  }

  // Update all fields in batch
  const now = new Date().toISOString();
  for (const fv of fieldValues) {
    await db
      .update(documentFields)
      .set({ value: fv.value, filledAt: now })
      .where(eq(documentFields.id, fv.fieldId));
  }

  // Re-fetch to check completion
  const updatedFields = await db.query.documentFields.findMany({
    where: eq(documentFields.recipientId, recipient.id),
  });
  const allRequiredFilled = updatedFields
    .filter((f) => f.required)
    .every((f) => f.value);

  if (allRequiredFilled) {
    // Mark recipient as signed
    await db
      .update(documentRecipients)
      .set({ status: "signed", signedAt: now })
      .where(eq(documentRecipients.id, recipient.id));

    // Check if all signers have signed
    const doc = await db.query.documents.findFirst({
      where: eq(documents.id, recipient.documentId),
      with: { recipients: true },
    });

    if (doc) {
      const allSigners = doc.recipients.filter((r) => r.role === "signer");
      const allSigned = allSigners.every(
        (r) => r.status === "signed" || r.id === recipient.id
      );

      if (allSigned) {
        await db
          .update(documents)
          .set({
            status: "completed",
            completedAt: now,
            updatedAt: now,
          })
          .where(eq(documents.id, recipient.documentId));

        await db.insert(documentAuditLog).values({
          id: nanoid(),
          documentId: recipient.documentId,
          action: "completed",
          actorEmail: recipient.email,
          actorName: recipient.name,
        });
      } else {
        await db
          .update(documents)
          .set({ status: "partially_signed", updatedAt: now })
          .where(eq(documents.id, recipient.documentId));
      }
    }

    await db.insert(documentAuditLog).values({
      id: nanoid(),
      documentId: recipient.documentId,
      action: "signed",
      actorEmail: recipient.email,
      actorName: recipient.name,
      metadata: JSON.stringify({ fieldCount: fieldValues.length, bulk: true }),
    });
  }

  revalidatePath(`/documents/${recipient.documentId}`);
  return { success: true };
}

export async function markDocumentViewed(accessToken: string) {
  const recipient = await db.query.documentRecipients.findFirst({
    where: eq(documentRecipients.accessToken, accessToken),
  });

  if (!recipient) return { error: "Invalid access token" };

  if (!recipient.viewedAt) {
    await db
      .update(documentRecipients)
      .set({
        status: recipient.status === "sent" ? "viewed" : recipient.status,
        viewedAt: new Date().toISOString(),
      })
      .where(eq(documentRecipients.id, recipient.id));

    // Update document status to viewed if it was just sent
    const doc = await db.query.documents.findFirst({
      where: eq(documents.id, recipient.documentId),
    });

    if (doc?.status === "sent") {
      await db
        .update(documents)
        .set({
          status: "viewed",
          updatedAt: new Date().toISOString(),
        })
        .where(eq(documents.id, recipient.documentId));
    }

    await db.insert(documentAuditLog).values({
      id: nanoid(),
      documentId: recipient.documentId,
      action: "viewed",
      actorEmail: recipient.email,
      actorName: recipient.name,
    });
  }

  return { success: true };
}

export async function voidDocument(documentId: string) {
  await verifyDocumentOwner(documentId);

  await db
    .update(documents)
    .set({
      status: "voided",
      updatedAt: new Date().toISOString(),
    })
    .where(eq(documents.id, documentId));

  await db.insert(documentAuditLog).values({
    id: nanoid(),
    documentId,
    action: "voided",
    actorName: "System",
  });

  revalidatePath(`/documents/${documentId}`);
  revalidatePath("/documents");

  return { success: true };
}

export async function deleteDocument(documentId: string) {
  await verifyDocumentOwner(documentId);
  await db.delete(documents).where(eq(documents.id, documentId));

  revalidatePath("/documents");
  return { success: true };
}

export async function removeRecipient(recipientId: string) {
  const userId = await getCurrentUserId();

  const recipient = await db.query.documentRecipients.findFirst({
    where: eq(documentRecipients.id, recipientId),
  });
  if (!recipient) return { error: "Recipient not found" };

  // Verify ownership
  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, recipient.documentId),
  });
  if (!doc || doc.ownerId !== userId) return { error: "Access denied" };

  await db
    .delete(documentRecipients)
    .where(eq(documentRecipients.id, recipientId));

  revalidatePath(`/documents/${recipient.documentId}`);
  return { success: true };
}

