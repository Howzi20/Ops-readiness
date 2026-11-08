"use server";
import { redirect } from "next/navigation";
import { login, logout } from "@/lib/auth";

export async function loginAction(_prev: { error?: string } | undefined, form: FormData) {
  const ok = await login(String(form.get("email") ?? ""), String(form.get("password") ?? ""));
  if (!ok) return { error: "Email or password is incorrect." };
  redirect("/readiness");
}

export async function logoutAction() {
  await logout();
  redirect("/login");
}
