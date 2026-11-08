"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./ui";

export function NavLink({
  href,
  children,
  exact = false,
  exclude,
}: {
  href: string;
  children: React.ReactNode;
  exact?: boolean;
  exclude?: string;
}) {
  const path = usePathname();
  const active = (exact ? path === href : path.startsWith(href)) && !(exclude && path.startsWith(exclude));
  return (
    <Link
      href={href}
      className={cx(
        "block rounded-md px-2 py-1.5",
        active ? "bg-white/10 font-medium text-white" : "hover:bg-white/5 hover:text-white",
      )}
    >
      {children}
    </Link>
  );
}

export function TabLink({ href, children, exact = false }: { href: string; children: React.ReactNode; exact?: boolean }) {
  const path = usePathname();
  const active = exact ? path === href : path.startsWith(href);
  return (
    <Link
      href={href}
      className={cx(
        "-mb-px border-b-2 px-3 py-2 text-sm",
        active ? "border-accent font-medium text-ink" : "border-transparent text-muted hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}
