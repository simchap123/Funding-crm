"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tags } from "@/lib/db/schema";
import { tagSchema } from "@/lib/validators/tags";
import { auth } from "@/lib/auth";

async function getCurrentUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function createTag(data: { name: string; color: string }) {
  const userId = await getCurrentUserId();
  const validated = tagSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.issues[0].message };
  }

  const existing = await db.query.tags.findFirst({
    where: eq(tags.name, validated.data.name),
  });
  if (existing) {
    return { error: "A tag with this name already exists" };
  }

  const id = nanoid();
  await db.insert(tags).values({
    id,
    name: validated.data.name,
    color: validated.data.color,
    ownerId: userId,
  });

  revalidatePath("/settings/tags");
  revalidatePath("/contacts");
  return { success: true, id };
}

export async function updateTag(
  id: string,
  data: { name: string; color: string }
) {
  await getCurrentUserId();
  const validated = tagSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.issues[0].message };
  }

  await db
    .update(tags)
    .set({ name: validated.data.name, color: validated.data.color })
    .where(eq(tags.id, id));

  revalidatePath("/settings/tags");
  revalidatePath("/contacts");
  return { success: true };
}

export async function deleteTag(id: string) {
  await getCurrentUserId();

  await db.delete(tags).where(eq(tags.id, id));

  revalidatePath("/settings/tags");
  revalidatePath("/contacts");
  return { success: true };
}
