import { db } from "@/lib/db";
import {
  documents,
  documentRecipients,
  documentAttachments,
  documentAuditLog,
} from "@/lib/db/schema";
import { eq, desc, count } from "drizzle-orm";
import type { DocumentStatus } from "@/lib/db/schema/documents";

export async function getDocuments({
  status,
  page = 1,
  limit = 10,
}: {
  status?: DocumentStatus;
  page?: number;
  limit?: number;
} = {}) {
  const offset = (page - 1) * limit;

  const allDocs = status
    ? await db.query.documents.findMany({
        where: eq(documents.status, status),
        with: {
          recipients: true,
          contact: true,
          loan: true,
        },
        orderBy: [desc(documents.createdAt)],
        limit,
        offset,
      })
    : await db.query.documents.findMany({
        with: {
          recipients: true,
          contact: true,
          loan: true,
        },
        orderBy: [desc(documents.createdAt)],
        limit,
        offset,
      });

  const totalResult = status
    ? await db
        .select({ count: count() })
        .from(documents)
        .where(eq(documents.status, status))
    : await db.select({ count: count() }).from(documents);

  return {
    documents: allDocs,
    total: totalResult[0].count,
    page,
    totalPages: Math.ceil(totalResult[0].count / limit),
  };
}

export async function getDocumentById(id: string) {
  return db.query.documents.findFirst({
    where: eq(documents.id, id),
    with: {
      recipients: {
        with: {
          fields: true,
        },
      },
      attachments: {
        with: {
          fields: true,
        },
        orderBy: [desc(documentAttachments.order)],
      },
      fields: true,
      auditLog: {
        orderBy: [desc(documentAuditLog.createdAt)],
      },
      contact: true,
      loan: true,
    },
  });
}

export async function getDocumentByToken(accessToken: string) {
  const recipient = await db.query.documentRecipients.findFirst({
    where: eq(documentRecipients.accessToken, accessToken),
    with: {
      document: {
        with: {
          fields: true,
          recipients: true,
        },
      },
      fields: true,
    },
  });

  return recipient;
}

export async function getDocumentStats() {
  const allDocs = await db.query.documents.findMany();

  const total = allDocs.length;
  const draft = allDocs.filter((d) => d.status === "draft").length;
  const pending = allDocs.filter((d) =>
    ["sent", "viewed", "partially_signed"].includes(d.status)
  ).length;
  const completed = allDocs.filter((d) => d.status === "completed").length;

  return { total, draft, pending, completed };
}
