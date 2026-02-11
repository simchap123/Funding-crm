"use server";

import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { registerSchema } from "@/lib/validators/auth";
import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export async function registerUser(formData: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}) {
  try {
    const validated = registerSchema.safeParse(formData);
    if (!validated.success) {
      return { error: validated.error.issues[0].message };
    }

    const { name, email, password } = validated.data;

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return { error: "An account with this email already exists" };
    }

    const passwordHash = await hash(password, 12);
    const id = nanoid();

    await db.insert(users).values({
      id,
      name,
      email,
      passwordHash,
    });

    return { success: true };
  } catch (err) {
    console.error("Registration error:", err);
    return { error: err instanceof Error ? err.message : "Registration failed" };
  }
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
