import Link from "next/link";
import { getContacts, getFlags } from "@/modules/readiness/queries";
import { Card, Empty, FlagPill } from "@/components/ui";
import { fmtDate } from "@/lib/dates";
import { STATUS_LABEL, type Status } from "@/modules/readiness/constants";
import { FlagFilters } from "./FlagFilters";

export const metadata = { title: "Flags" };

export default async function FlagsPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ person?: string; workstream?: string; flag?: string }>;
}) {
  const { siteId } = await params;
  const sp = await searchParams;
  const [all, contacts] = await Promise.all([getFlags(siteId), getContacts(siteId)]);
  const streams = [...new Map(all.map((t) => [t.workstream.id, t.workstream])).values()];
  const rows = all.filter(
    (t) =>
      (!sp.person || t.ownerId === sp.person || t.signOffId === sp.person) &&
      (!sp.workstream || t.workstream.id === sp.workstream) &&
      (!sp.flag || t.flag === sp.flag),
  );
  const red = all.filter((t) => t.flag === "RED").length;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted">
          <span className="font-semibold text-rag-red tabular">{red}</span> red and{" "}
          <span className="font-semibold text-[#94690a] tabular">{all.length - red}</span> yellow tasks. Red = past target date and not complete; yellow = due within 14 days and under 50%.
        </p>
        <FlagFilters
          contacts={contacts.map((c) => ({ id: c.id, label: `${c.initials} — ${c.name}` }))}
          streams={streams.map((w) => ({ id: w.id, label: `${w.code} ${w.name}` }))}
        />
      </div>
      {rows.length === 0 ? (
        <Empty>{all.length === 0 ? "No red or yellow flags. Everything is on track." : "No flags match these filters."}</Empty>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Flag</th>
                <th className="px-4 py-2.5 font-medium">Task</th>
                <th className="px-4 py-2.5 font-medium">Workstream</th>
                <th className="px-4 py-2.5 font-medium">Owner</th>
                <th className="px-4 py-2.5 font-medium">Target date</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 text-right font-medium">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((t) => (
                <tr key={t.id} className="align-top hover:bg-canvas/60">
                  <td className="px-4 py-2.5"><FlagPill flag={t.flag} /></td>
                  <td className="max-w-md px-4 py-2.5">
                    <Link href={`/readiness/sites/${siteId}/workstreams/${t.workstream.id}`} className="line-clamp-2 text-ink hover:text-accent">{t.title}</Link>
                    {t.flagOverride && <div className="mt-0.5 text-xs text-muted">Manual: {t.overrideNote}</div>}
                    {!t.flagOverride && (t.updates[0] || t.notes) && (
                      <div className="mt-0.5 line-clamp-1 text-xs text-muted">
                        {t.updates[0] ? `💬 ${t.updates[0].authorName}: ${t.updates[0].body}` : t.notes}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-muted"><span className="tabular">{t.workstream.code}</span> {t.workstream.name}</td>
                  <td className="px-4 py-2.5" title={t.owner?.name}>{t.owner?.initials ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 tabular">
                    {fmtDate(t.targetDate)}
                    {t.days !== null && <div className={"text-xs " + (t.days < 0 ? "text-rag-red" : "text-muted")}>{t.days < 0 ? `${-t.days} days overdue` : `in ${t.days} days`}</div>}
                  </td>
                  <td className="px-4 py-2.5">{STATUS_LABEL[t.status as Status]}</td>
                  <td className="px-4 py-2.5 text-right tabular">{t.progress}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
