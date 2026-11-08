import Link from "next/link";
import { getSite } from "@/modules/readiness/queries";
import { TabLink } from "@/components/NavLink";
import { fmtDate } from "@/lib/dates";

export default async function SiteLayout({ children, params }: { children: React.ReactNode; params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const site = await getSite(siteId);
  const base = `/readiness/sites/${siteId}`;
  return (
    <>
      <div className="mb-5">
        <Link href="/readiness" className="text-sm text-muted hover:text-accent">← Sites</Link>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{site.name}</h1>
          <span className="text-sm text-muted">
            {site.client || "No client"} · PC {fmtDate(site.pcDate)} · Go-Live {fmtDate(site.goLiveDate)}
          </span>
        </div>
      </div>
      <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-line">
        <TabLink href={base} exact>Dashboard</TabLink>
        <TabLink href={`${base}/workstreams`}>Workstreams</TabLink>
        <TabLink href={`${base}/flags`}>Flags</TabLink>
        <TabLink href={`${base}/risks`}>Risks</TabLink>
        <TabLink href={`${base}/contacts`}>Contacts</TabLink>
        <TabLink href={`${base}/dates`}>Key Dates</TabLink>
        <TabLink href={`${base}/settings`}>Settings</TabLink>
      </nav>
      {children}
    </>
  );
}
