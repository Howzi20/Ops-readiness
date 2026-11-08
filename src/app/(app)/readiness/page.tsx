import Link from "next/link";
import { getSitesOverview } from "@/modules/readiness/queries";
import { btn, Card, Empty, PageHeader, ProgressBar, pct } from "@/components/ui";

export const metadata = { title: "Sites" };

function days(n: number | null, label: string) {
  if (n === null) return <span className="text-muted">{label} —</span>;
  return (
    <span>
      <span className="font-semibold text-ink tabular">{n >= 0 ? n : `+${-n}`}</span>{" "}
      <span className="text-muted">{n >= 0 ? `days to ${label}` : `days since ${label}`}</span>
    </span>
  );
}

export default async function SitesPage() {
  const sites = await getSitesOverview();
  return (
    <>
      <PageHeader
        title="Sites"
        subtitle="Every site being brought to operational readiness"
        actions={<Link href="/readiness/sites/new" className={btn.primary}>+ New site</Link>}
      />
      {sites.length === 0 ? (
        <Empty>No sites yet. Create one from a template to get started.</Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sites.map((s) => (
            <Link key={s.id} href={`/readiness/sites/${s.id}`} className="group">
              <Card className="h-full p-5 transition group-hover:border-accent/50 group-hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-ink">{s.name}</div>
                    <div className="truncate text-sm text-muted">{s.client || "No client set"}</div>
                  </div>
                  <div className="text-right text-2xl font-semibold text-accent tabular">{pct(s.completion)}</div>
                </div>
                <ProgressBar value={s.completion} className="mt-3" />
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {days(s.daysToPc, "PC")}
                  {days(s.daysToGoLive, "Go-Live")}
                </div>
                <div className="mt-3 flex items-center gap-3 border-t border-line pt-3 text-sm">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-rag-red" />
                    <span className="tabular font-medium text-ink">{s.red}</span> red
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-rag-yellow" />
                    <span className="tabular font-medium text-ink">{s.yellow}</span> yellow
                  </span>
                  <span className="ml-auto text-xs text-muted">{s.template ?? "Blank"}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
