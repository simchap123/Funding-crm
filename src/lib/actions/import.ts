"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { contacts, activities } from "@/lib/db/schema";
import { auth } from "@/lib/auth";

async function getCurrentUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

interface ImportRow {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  stage?: string;
  source?: string;
}

export async function importContacts(rows: ImportRow[]) {
  const userId = await getCurrentUserId();

  const BATCH_SIZE = 100;
  let imported = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    const values = batch.map((row) => ({
      id: nanoid(),
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email || null,
      phone: row.phone || null,
      company: row.company || null,
      jobTitle: row.jobTitle || null,
      stage: (row.stage as any) || "new",
      source: (row.source as any) || null,
      ownerId: userId,
    }));

    await db.insert(contacts).values(values);

    // Log activities
    const activityValues = values.map((v) => ({
      id: nanoid(),
      contactId: v.id,
      type: "contact_created" as const,
      description: "Imported from CSV",
      userId,
    }));

    await db.insert(activities).values(activityValues);

    imported += batch.length;
  }

  revalidatePath("/contacts");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");

  return { success: true, imported };
}
