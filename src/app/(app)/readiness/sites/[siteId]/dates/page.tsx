import { db } from "@/lib/db";
import { getSite } from "@/modules/readiness/queries";
import { daysUntil } from "@/modules/readiness/rules";
import { fmtDate } from "@/lib/dates";
import { Card } from "@/components/ui";
import { AddKeyDate, DeleteKeyDate } from "./KeyDateControls";
import Link from "next/link";

export const metadata = { title: "Key dates" };

export default async function DatesPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const site = await getSite(siteId);
  const custom = await db.keyDate.findMany({ where: { siteId }, orderBy: { date: "asc" } });
  const rows = [
    { id: "ts", name: "Transition start", date: site.transitionStart, builtIn: true },
    { id: "pc", name: "Practical Completion (PC)", date: site.pcDate, builtIn: true },
    { id: "gl", name: "Go-Live", date: site.goLiveDate, builtIn: true },
    ...custom.map((k) => ({ id: k.id, name: k.name, date: k.date as Date | null, builtIn: false })),
  ].sort((a, b) => (a.date?.getTime() ?? Infinity) - (b.date?.getTime() ?? Infinity));

  return (
    <div className="max-w-3xl space-y-4">
      <Card>
        <ul className="divide-y divide-line">
          {rows.map((r) => {
            const d = daysUntil(r.date);
            return (
              <li key={r.id} className="flex items-center gap-4 px-4 py-3">
                <div className="w-28 text-right">
                  {d === null ? (
                    <span className="text-sm text-muted">not set</span>
                  ) : (
                    <>
                      <span className={"text-xl font-semibold tabular " + (d < 0 ? "text-muted" : "text-ink")}>{Math.abs(d)}</span>
                      <span className="ml-1 text-xs text-muted">{d < 0 ? "days ago" : d === 0 ? "today" : "days"}</span>
                    </>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-ink">{r.name}</div>
                  <div className="text-sm text-muted">{fmtDate(r.date)}</div>
                </div>
                {r.builtIn ? (
                  <Link href={`/readiness/sites/${siteId}/settings`} className="text-xs text-muted hover:text-accent">Edit in settings</Link>
                ) : (
                  <DeleteKeyDate siteId={siteId} id={r.id} />
                )}
              </li>
            );
          })}
        </ul>
      </Card>
      <AddKeyDate siteId={siteId} />
    </div>
  );
}
