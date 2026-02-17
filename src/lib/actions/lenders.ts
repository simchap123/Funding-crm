"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { lenders } from "@/lib/db/schema";
import { auth } from "@/lib/auth";

async function getCurrentUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function createLender(data: {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  notes?: string;
  submissionGuidelines?: string;
}) {
  const userId = await getCurrentUserId();

  if (!data.name || !data.email) {
    return { error: "Name and email are required" };
  }

  const id = nanoid();
  await db.insert(lenders).values({
    id,
    name: data.name.trim(),
    email: data.email.trim(),
    company: data.company?.trim() || null,
    phone: data.phone?.trim() || null,
    notes: data.notes?.trim() || null,
    submissionGuidelines: data.submissionGuidelines?.trim() || null,
    ownerId: userId,
    sortOrder: 0,
    isActive: true,
  });

  revalidatePath("/settings/lenders");
  return { success: true, id };
}

export async function updateLender(
  id: string,
  data: {
    name: string;
    email: string;
    company?: string;
    phone?: string;
    notes?: string;
    submissionGuidelines?: string;
    isActive?: boolean;
  }
) {
  await getCurrentUserId();

  const existing = await db.query.lenders.findFirst({
    where: eq(lenders.id, id),
  });
  if (!existing) return { error: "Lender not found" };

  await db
    .update(lenders)
    .set({
      name: data.name.trim(),
      email: data.email.trim(),
      company: data.company?.trim() || null,
      phone: data.phone?.trim() || null,
      notes: data.notes?.trim() || null,
      submissionGuidelines: data.submissionGuidelines?.trim() || null,
      isActive: data.isActive ?? existing.isActive,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(lenders.id, id));

  revalidatePath("/settings/lenders");
  return { success: true };
}

export async function deleteLender(id: string) {
  await getCurrentUserId();
  await db.delete(lenders).where(eq(lenders.id, id));

  revalidatePath("/settings/lenders");
  return { success: true };
}

export async function toggleLenderActive(id: string, isActive: boolean) {
  await getCurrentUserId();
  await db
    .update(lenders)
    .set({ isActive, updatedAt: new Date().toISOString() })
    .where(eq(lenders.id, id));

  revalidatePath("/settings/lenders");
  return { success: true };
}
