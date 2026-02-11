"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { followUps } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import type { FollowUpType } from "@/lib/db/schema/follow-ups";

async function getCurrentUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function createFollowUp(data: {
  title: string;
  description?: string;
  type?: FollowUpType;
  dueDate: string;
  dueTime?: string;
  contactId?: string;
  loanId?: string;
}) {
  const userId = await getCurrentUserId();

  const id = nanoid();
  await db.insert(followUps).values({
    id,
    title: data.title,
    description: data.description || null,
    type: data.type || "reminder",
    dueDate: data.dueDate,
    dueTime: data.dueTime || null,
    contactId: data.contactId || null,
    loanId: data.loanId || null,
    ownerId: userId,
  });

  revalidatePath("/calendar");
  return { success: true, id };
}

export async function updateFollowUp(
  id: string,
  data: {
    title?: string;
    description?: string;
    type?: FollowUpType;
    dueDate?: string;
    dueTime?: string;
    status?: string;
    contactId?: string;
    loanId?: string;
  }
) {
  await getCurrentUserId();

  const updates: Record<string, any> = {
    updatedAt: new Date().toISOString(),
  };

  if (data.title !== undefined) updates.title = data.title;
  if (data.description !== undefined) updates.description = data.description;
  if (data.type !== undefined) updates.type = data.type;
  if (data.dueDate !== undefined) updates.dueDate = data.dueDate;
  if (data.dueTime !== undefined) updates.dueTime = data.dueTime;
  if (data.status !== undefined) updates.status = data.status;
  if (data.contactId !== undefined) updates.contactId = data.contactId;
  if (data.loanId !== undefined) updates.loanId = data.loanId;

  if (data.status === "completed") {
    updates.completedAt = new Date().toISOString();
  }

  await db.update(followUps).set(updates).where(eq(followUps.id, id));

  revalidatePath("/calendar");
  return { success: true };
}

export async function rescheduleFollowUp(id: string, newDate: string) {
  await getCurrentUserId();

  await db
    .update(followUps)
    .set({
      dueDate: newDate,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(followUps.id, id));

  revalidatePath("/calendar");
  return { success: true };
}

export async function completeFollowUp(id: string) {
  return updateFollowUp(id, { status: "completed" });
}

export async function deleteFollowUp(id: string) {
  await getCurrentUserId();
  await db.delete(followUps).where(eq(followUps.id, id));
  revalidatePath("/calendar");
  return { success: true };
}
