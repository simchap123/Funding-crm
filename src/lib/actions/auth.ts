"use server";

import { hash, compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { registerSchema, changePasswordSchema } from "@/lib/validators/auth";
import { signIn, auth } from "@/lib/auth";
import { AuthError } from "next-auth";

export async function registerUser(formData: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}) {
  // Registration is disabled — only existing users can log in
  return { error: "Registration is currently disabled. Contact your administrator." };
}

export async function changePassword(formData: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const parsed = changePasswordSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });
  if (!user) return { error: "User not found" };

  const passwordMatch = await compare(parsed.data.currentPassword, user.passwordHash);
  if (!passwordMatch) return { error: "Current password is incorrect" };

  const newHash = await hash(parsed.data.newPassword, 12);
  await db
    .update(users)
    .set({ passwordHash: newHash, updatedAt: new Date().toISOString() })
    .where(eq(users.id, session.user.id));

  return { success: true };
}

export async function createUser(formData: {
  name: string;
  email: string;
  password: string;
  role?: "admin" | "user";
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  // Only admins can create users
  const currentUser = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });
  if (!currentUser || currentUser.role !== "admin") {
    return { error: "Only admins can create users" };
  }

  // Check if email already exists
  const existing = await db.query.users.findFirst({
    where: eq(users.email, formData.email),
  });
  if (existing) return { error: "A user with this email already exists" };

  const id = nanoid();
  const passwordHash = await hash(formData.password, 12);

  await db.insert(users).values({
    id,
    name: formData.name,
    email: formData.email,
    passwordHash,
    role: formData.role || "user",
  });

  return { success: true, id };
}

export async function loginUser(formData: {
  email: string;
  password: string;
  callbackUrl?: string;
}) {
  try {
    await signIn("credentials", {
      email: formData.email,
      password: formData.password,
      redirectTo: formData.callbackUrl || "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password" };
    }
    throw error;
  }
}
