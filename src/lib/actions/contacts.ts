"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts, activities, contactTags } from "@/lib/db/schema";
import { contactFormSchema, type ContactFormInput } from "@/lib/validators/contacts";
import { auth } from "@/lib/auth";
import type { LeadStage } from "@/lib/db/schema/contacts";

async function getCurrentUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function createContact(data: ContactFormInput) {
  const userId = await getCurrentUserId();
  const validated = contactFormSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.issues[0].message };
  }

  const id = nanoid();
  await db.insert(contacts).values({
    id,
    ...validated.data,
    email: validated.data.email || null,
    source: validated.data.source || null,
    website: validated.data.website || null,
    ownerId: userId,
  });

  await db.insert(activities).values({
    id: nanoid(),
    contactId: id,
    type: "contact_created",
    description: "Contact was created",
    userId,
  });

  revalidatePath("/contacts");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");

  return { success: true, id };
}

export async function updateContact(id: string, data: ContactFormInput) {
  const userId = await getCurrentUserId();
  const validated = contactFormSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.issues[0].message };
  }

  const existing = await db.query.contacts.findFirst({
    where: eq(contacts.id, id),
  });
  if (!existing) return { error: "Contact not found" };

  await db
    .update(contacts)
    .set({
      ...validated.data,
      email: validated.data.email || null,
      source: validated.data.source || null,
      website: validated.data.website || null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(contacts.id, id));

  // Log stage change
  if (existing.stage !== validated.data.stage) {
    await db.insert(activities).values({
      id: nanoid(),
      contactId: id,
      type: "stage_changed",
      description: `Stage changed from ${existing.stage} to ${validated.data.stage}`,
      metadata: JSON.stringify({
        from: existing.stage,
        to: validated.data.stage,
      }),
      userId,
    });
  }

  await db.insert(activities).values({
    id: nanoid(),
    contactId: id,
    type: "contact_updated",
    description: "Contact details were updated",
    userId,
  });

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");

  return { success: true };
}

export async function deleteContact(id: string) {
  await getCurrentUserId();

  await db.delete(contacts).where(eq(contacts.id, id));

  revalidatePath("/contacts");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");

  return { success: true };
}

export async function deleteContacts(ids: string[]) {
  await getCurrentUserId();

  await db.delete(contacts).where(inArray(contacts.id, ids));

  revalidatePath("/contacts");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");

  return { success: true };
}

export async function updateContactStage(id: string, stage: LeadStage) {
  const userId = await getCurrentUserId();

  const existing = await db.query.contacts.findFirst({
    where: eq(contacts.id, id),
  });
  if (!existing) return { error: "Contact not found" };

  await db
    .update(contacts)
    .set({ stage, updatedAt: new Date().toISOString() })
    .where(eq(contacts.id, id));

  if (existing.stage !== stage) {
    await db.insert(activities).values({
      id: nanoid(),
      contactId: id,
      type: "stage_changed",
      description: `Stage changed from ${existing.stage} to ${stage}`,
      metadata: JSON.stringify({ from: existing.stage, to: stage }),
      userId,
    });
  }

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");

  return { success: true };
}

export async function assignContactTags(
  contactId: string,
  tagIds: string[]
) {
  const userId = await getCurrentUserId();

  // Remove existing tags
  await db
    .delete(contactTags)
    .where(eq(contactTags.contactId, contactId));

  // Insert new tags
  if (tagIds.length > 0) {
    await db.insert(contactTags).values(
      tagIds.map((tagId) => ({
        contactId,
        tagId,
      }))
    );
  }

  await db.insert(activities).values({
    id: nanoid(),
    contactId,
    type: "tag_added",
    description: "Tags were updated",
    userId,
  });

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${contactId}`);

  return { success: true };
}
