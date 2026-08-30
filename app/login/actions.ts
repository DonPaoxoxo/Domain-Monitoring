"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

export interface LoginState {
  error?: string;
}

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Invalid username or password." };
  }

  const isEnvAdmin = username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD;

  if (!isEnvAdmin) {
    const admin = await prisma.admin.findUnique({ where: { username } });
    if (!admin || !verifyPassword(password, admin.passwordHash)) {
      return { error: "Invalid username or password." };
    }
  }

  await createSession(username);
  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
