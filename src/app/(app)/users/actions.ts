"use server";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { hashPassword, requireUser } from "@/lib/auth";

type R = { ok: true; message?: string } | { ok: false; error: string };

export async function addUser(_prev: R | undefined, form: FormData): Promise<R> {
  await requireUser();
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!name || !email) return { ok: false, error: "Name and email are required" };
  if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters" };
  if (await db.user.findUnique({ where: { email } })) return { ok: false, error: "That email already has a login" };
  await db.user.create({ data: { name, email, passwordHash: await hashPassword(password) } });
  revalidatePath("/users");
  return { ok: true, message: `Added ${name}` };
}

export async function changePassword(_prev: R | undefined, form: FormData): Promise<R> {
  const me = await requireUser();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  if (!(await bcrypt.compare(current, me.passwordHash))) return { ok: false, error: "Current password is incorrect" };
  if (next.length < 8) return { ok: false, error: "New password must be at least 8 characters" };
  await db.user.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(next) } });
  return { ok: true, message: "Password changed" };
}
