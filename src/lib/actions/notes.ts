"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { notes, activities } from "@/lib/db/schema";
import { noteSchema } from "@/lib/validators/notes";
import { auth } from "@/lib/auth";

async function getCurrentUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function addNote(contactId: string, data: { content: string; pinned?: boolean }) {
  const userId = await getCurrentUserId();
  const validated = noteSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.issues[0].message };
  }

  const noteId = nanoid();
  await db.insert(notes).values({
    id: noteId,
    contactId,
    content: validated.data.content,
    pinned: validated.data.pinned,
    authorId: userId,
  });

  await db.insert(activities).values({
    id: nanoid(),
    contactId,
    type: "note_added",
    description: "Added a note",
    userId,
  });

  revalidatePath(`/contacts/${contactId}`);
  return { success: true };
}

export async function deleteNote(noteId: string, contactId: string) {
  await getCurrentUserId();

  await db.delete(notes).where(eq(notes.id, noteId));

  revalidatePath(`/contacts/${contactId}`);
  return { success: true };
}

export async function toggleNotePin(noteId: string, contactId: string, pinned: boolean) {
  await getCurrentUserId();

  await db
    .update(notes)
    .set({ pinned, updatedAt: new Date().toISOString() })
    .where(eq(notes.id, noteId));

  revalidatePath(`/contacts/${contactId}`);
  return { success: true };
}
