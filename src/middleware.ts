import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, loginRequired, verifySession } from "@/lib/session";

export async function middleware(req: NextRequest) {
  if (!loginRequired()) return NextResponse.next();
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    const url = new URL("/login", req.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // everything except login, Next internals and static files
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico).*)"],
};
