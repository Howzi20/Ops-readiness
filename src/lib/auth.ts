import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { SESSION_COOKIE, loginRequired, sessionCookieOptions, signSession, verifySession } from "./session";

const PROTOTYPE_EMAIL = "prototype@readiness.local";

export async function getSession() {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

/** Use in server components / actions that require a logged-in user. */
export async function requireUser() {
  if (!loginRequired()) {
    // prototype mode: everyone acts as one shared user, no password needed.
    // Read first so ordinary page loads never write to the database.
    const existing = await db.user.findUnique({ where: { email: PROTOTYPE_EMAIL } });
    if (existing) return existing;
    return db.user.upsert({
      where: { email: PROTOTYPE_EMAIL },
      update: {},
      create: { name: "Prototype user", email: PROTOTYPE_EMAIL, passwordHash: "!login-disabled" },
    });
  }
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user) redirect("/login");
  return user;
}

export async function login(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return false;
  const store = await cookies();
  store.set(SESSION_COOKIE, await signSession({ userId: user.id, name: user.name }), sessionCookieOptions);
  return true;
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}
