import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logoutAction } from "../login/actions";
import { NavLink } from "@/components/NavLink";
import { loginRequired } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const withLogin = loginRequired();
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col bg-ink text-white/80">
        <Link href="/readiness" className="px-5 py-5 text-lg font-semibold leading-tight tracking-tight text-white">
          Operations<br />Readiness
        </Link>
        <nav className="flex-1 space-y-6 px-3 text-sm">
          <div>
                        <NavLink href="/readiness" exact={false} exclude="/readiness/templates">Sites</NavLink>
            <NavLink href="/readiness/templates">Templates</NavLink>
            <NavLink href="/outbox">Outbox</NavLink>
          </div>
          {withLogin && (
            <div>
              <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">Admin</div>
              <NavLink href="/users">Users</NavLink>
            </div>
          )}
        </nav>
        <div className="border-t border-white/10 px-5 py-4 text-sm">
          {withLogin ? (
            <>
              <div className="truncate text-white">{user.name}</div>
              <div className="truncate text-xs text-white/50">{user.email}</div>
              <form action={logoutAction}>
                <button className="mt-2 text-xs text-white/60 hover:text-white">Sign out</button>
              </form>
            </>
          ) : (
            <>
              <div className="text-white">Prototype mode</div>
              <div className="text-xs text-white/50">No login required</div>
            </>
          )}
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-8 py-7">{children}</main>
    </div>
  );
}
