"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  documents,
  documentRecipients,
  documentFields,
  documentAttachments,
  documentAuditLog,
} from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import type { DocumentFieldType } from "@/lib/db/schema/documents";

async function getCurrentUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
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
  await getCurrentUserId();

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
  await getCurrentUserId();

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
  await getCurrentUserId();

  const attachment = await db.query.documentAttachments.findFirst({
    where: eq(documentAttachments.id, attachmentId),
  });
  if (!attachment) return { error: "Attachment not found" };

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
}) {
  await getCurrentUserId();

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
  });

  revalidatePath(`/documents/${data.documentId}`);
  return { success: true, id };
}

export async function sendDocument(documentId: string) {
  const userId = await getCurrentUserId();

  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, documentId),
    with: { recipients: true },
  });

  if (!doc) return { error: "Document not found" };
  if (doc.recipients.length === 0)
    return { error: "Add at least one recipient" };

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

  // In production, send emails to recipients with signing links here
  // For now, the signing links are available via the access tokens

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
  await getCurrentUserId();

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
  await getCurrentUserId();
  await db.delete(documents).where(eq(documents.id, documentId));

  revalidatePath("/documents");
  return { success: true };
}

export async function removeRecipient(recipientId: string) {
  await getCurrentUserId();

  const recipient = await db.query.documentRecipients.findFirst({
    where: eq(documentRecipients.id, recipientId),
  });
  if (!recipient) return { error: "Recipient not found" };

  await db
    .delete(documentRecipients)
    .where(eq(documentRecipients.id, recipientId));

  revalidatePath(`/documents/${recipient.documentId}`);
  return { success: true };
}
