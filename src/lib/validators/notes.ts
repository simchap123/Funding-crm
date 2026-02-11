import { z } from "zod";

export const noteSchema = z.object({
  content: z.string().min(1, "Note content is required"),
  pinned: z.boolean().default(false),
});

export type NoteInput = z.infer<typeof noteSchema>;
