"use server";

import { revalidatePath } from "next/cache";
import { updateContactStage } from "./contacts";
import type { LeadStage } from "@/lib/db/schema/contacts";

export async function moveContactToStage(contactId: string, stage: LeadStage) {
  const result = await updateContactStage(contactId, stage);
  revalidatePath("/pipeline");
  return result;
}
