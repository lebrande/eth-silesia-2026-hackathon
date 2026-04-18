"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";

export type LoginState = { error?: string } | undefined;

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { error: "Podaj email i hasło" };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/app/dashboard",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Nieprawidłowy email lub hasło" };
    }
    throw err;
  }
  return undefined;
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
