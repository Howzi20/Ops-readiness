import Link from "next/link";
import { getSiteDashboard } from "@/modules/readiness/queries";
import { Card, Empty, ProgressBar, Stat, pct } from "@/components/ui";
import { fmtDate } from "@/lib/dates";
import { daysUntil } from "@/modules/readiness/rules";
import { AwaitingSignOff, StatusBreakdown, UpcomingDeadlines, Workload } from "@/components/charts/StatusWidgets";

function DateTile({ label, date, days }: { label: string; date: Date | null; days: number | null }) {
  return (
    <Card className="px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-ink tabular">
          {days === null ? "—" : days >= 0 ? days : `+${-days}`}
        </span>
        <span className="text-sm text-muted">{days === null ? "not set" : days >= 0 ? "days to go" : "days since"}</span>
      </div>
      <div className="text-xs text-muted">{fmtDate(date)}</div>
    </Card>
  );
}

export default async function SiteDashboard({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const d = await getSiteDashboard(siteId);
  const base = `/readiness/sites/${siteId}`;
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Card className="px-4 py-3 lg:col-span-2">
          <div className="text-xs font-medium uppercase tracking-wide text-muted">Overall completion</div>
          <div className="mt-1 text-3xl font-semibold text-accent tabular">{pct(d.overall.completion)}</div>
          <ProgressBar value={d.overall.completion} className="mt-2" />
          <div className="mt-2 flex gap-4 text-xs text-muted tabular">
            <span>Pre-PC {pct(d.preCompletion)}</span>
            <span>Post-PC {pct(d.postCompletion)}</span>
            <span>{d.overall.done}/{d.overall.total} tasks done</span>
          </div>
        </Card>
        <DateTile label="Practical Completion" date={d.site.pcDate} days={d.daysToPc} />
        <DateTile label="Go-Live" date={d.site.goLiveDate} days={d.daysToGoLive} />
        <Link href={`${base}/flags`}>
          <Stat label="Open flags" value={<><span className="text-rag-red">{d.overall.red}</span><span className="text-muted"> / </span><span className="text-[#94690a]">{d.overall.yellow}</span></>} />
        </Link>
        <Stat label="Workstreams at risk" value={d.atRiskCount} tone={d.atRiskCount ? "red" : undefined} />
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
        <Link href={`${base}/risks`} className="text-muted hover:text-accent">
          <span className="font-semibold text-ink tabular">{d.openRisks}</span> open risks →
        </Link>
        {d.upcoming.map((k) => (
          <span key={k.id} className="text-muted">
            <span className="font-medium text-ink">{k.name}</span> · {fmtDate(k.date)} ({daysUntil(k.date)} days)
          </span>
        ))}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2 2xl:grid-cols-4">
        <StatusBreakdown counts={d.statusCounts} />
        <Workload people={d.workload} />
        <AwaitingSignOff siteId={siteId} tasks={d.awaitingSignOff} />
        <UpcomingDeadlines siteId={siteId} tasks={d.upcomingTasks} />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Workstreams</h2>
        {d.streams.length === 0 ? (
          <Empty>No workstreams yet. Add them on the Workstreams tab.</Empty>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {d.streams.map((w) => (
              <Link key={w.id} href={`${base}/workstreams/${w.id}`} className="group">
                <Card className={"h-full p-4 transition group-hover:border-accent/50 group-hover:shadow-md " + (w.atRisk ? "border-l-4 border-l-rag-red" : "")}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs text-muted tabular">{w.code}</div>
                      <div className="truncate font-medium text-ink">{w.name}</div>
                      <div className="truncate text-xs text-muted" title="Owner">
                        <span className="text-muted/70">Owner</span> {w.owner ? w.owner.name : "—"}
                      </div>
                      <div className="truncate text-xs text-muted" title="Approver">
                        <span className="text-muted/70">Approver</span> {w.approver ? w.approver.name : "—"}
                      </div>
                    </div>
                    <div className="text-xl font-semibold text-ink tabular">{pct(w.completion)}</div>
                  </div>
                  <ProgressBar value={w.completion} className="mt-3" />
                  <div className="mt-3 flex items-center gap-3 text-xs text-muted">
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rag-red" /><span className="tabular">{w.red}</span></span>
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rag-yellow" /><span className="tabular">{w.yellow}</span></span>
                    <span className="ml-auto tabular">{w.done}/{w.total} done</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
