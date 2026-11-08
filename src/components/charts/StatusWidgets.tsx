import Link from "next/link";
import { STATUSES, STATUS_COLOR, STATUS_LABEL, type Status } from "@/modules/readiness/constants";
import { Avatar } from "@/components/Avatar";
import { Card } from "@/components/ui";

/** Status breakdown: one segmented bar plus a labelled legend with counts (identity never colour-alone). */
export function StatusBreakdown({ counts }: { counts: Record<string, number> }) {
  const total = STATUSES.reduce((n, s) => n + (counts[s] ?? 0), 0);
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-ink">Tasks by status</h3>
      <p className="text-xs text-muted tabular">{total} tasks</p>
      <div className="mt-3 flex h-4 w-full gap-[2px] overflow-hidden rounded">
        {STATUSES.filter((s) => counts[s]).map((s) => (
          <div
            key={s}
            title={`${STATUS_LABEL[s]}: ${counts[s]} (${Math.round(((counts[s] ?? 0) / total) * 100)}%)`}
            className="transition hover:brightness-90"
            style={{ width: `${((counts[s] ?? 0) / total) * 100}%`, background: STATUS_COLOR[s].bg }}
          />
        ))}
      </div>
      <table className="mt-3 w-full text-sm">
        <tbody>
          {STATUSES.map((s) => (
            <tr key={s}>
              <td className="py-1">
                <span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: STATUS_COLOR[s].bg }} />
                <span className="text-ink-soft">{STATUS_LABEL[s]}</span>
              </td>
              <td className="py-1 text-right font-medium text-ink tabular">{counts[s] ?? 0}</td>
              <td className="w-12 py-1 text-right text-muted tabular">{total ? Math.round(((counts[s] ?? 0) / total) * 100) : 0}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

const OPEN: Status[] = ["DELAYED", "IN_PROGRESS", "AWAITING_SIGNOFF", "TO_COMMENCE"];

/** Open tasks per owner, stacked by status. One shared scale across people. */
export function Workload({ people }: { people: { id: string; name: string; initials: string; by: Record<string, number>; open: number }[] }) {
  const max = Math.max(1, ...people.map((p) => p.open));
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-ink">Workload</h3>
          <p className="text-xs text-muted">Open tasks each person owns</p>
        </div>
        <div className="flex gap-3 text-xs text-muted">
          {OPEN.map((s) => (
            <span key={s} className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: STATUS_COLOR[s].bg }} />
              {STATUS_LABEL[s]}
            </span>
          ))}
        </div>
      </div>
      {people.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">No open tasks are assigned yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {people.map((p) => (
            <li key={p.id} className="grid grid-cols-[9rem_1fr_2.5rem] items-center gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <Avatar initials={p.initials} name={p.name} size={22} />
                <span className="truncate text-ink-soft">{p.name}</span>
              </span>
              <span className="flex h-3.5 gap-[2px]" style={{ width: `${(p.open / max) * 100}%` }}>
                {OPEN.filter((s) => p.by[s]).map((s, i, arr) => (
                  <span
                    key={s}
                    title={`${p.name} — ${STATUS_LABEL[s]}: ${p.by[s]}`}
                    className="h-full hover:brightness-90"
                    style={{
                      width: `${(p.by[s] / p.open) * 100}%`,
                      background: STATUS_COLOR[s].bg,
                      borderRadius: i === arr.length - 1 ? "0 4px 4px 0" : undefined,
                    }}
                  />
                ))}
              </span>
              <span className="text-right font-medium text-ink tabular">{p.open}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function UpcomingDeadlines({
  siteId,
  tasks,
}: {
  siteId: string;
  tasks: { id: string; title: string; status: string; days: number | null; flag: string; workstream: { id: string; code: string; name: string }; owner: { initials: string; name: string } | null }[];
}) {
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-ink">Due in the next 14 days</h3>
      <p className="text-xs text-muted">Open tasks, soonest first</p>
      {tasks.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Nothing due in the next two weeks.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="w-14 shrink-0 text-right text-xs tabular text-muted">
                {t.days === 0 ? "Today" : t.days === 1 ? "Tomorrow" : `${t.days} days`}
              </span>
              <span className="min-w-0 flex-1">
                <Link href={`/readiness/sites/${siteId}/workstreams/${t.workstream.id}`} className="line-clamp-1 text-ink hover:text-accent">{t.title}</Link>
                <span className="text-xs text-muted">{t.workstream.code} {t.workstream.name}</span>
              </span>
              <span
                className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium"
                style={{ background: STATUS_COLOR[t.status as Status].bg, color: STATUS_COLOR[t.status as Status].fg }}
              >
                {STATUS_LABEL[t.status as Status]}
              </span>
              {t.owner ? <Avatar initials={t.owner.initials} name={t.owner.name} size={22} /> : <span className="w-[22px]" />}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function AwaitingSignOff({
  siteId,
  tasks,
}: {
  siteId: string;
  tasks: { id: string; title: string; workstream: { id: string; code: string; name: string }; signOff: { initials: string; name: string } | null }[];
}) {
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-ink">
        Awaiting sign-off <span className="ml-1 rounded-full px-2 text-xs text-white tabular" style={{ background: STATUS_COLOR.AWAITING_SIGNOFF.bg }}>{tasks.length}</span>
      </h3>
      <p className="text-xs text-muted">Finished by the owner, waiting for approval</p>
      {tasks.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Nothing waiting for sign-off.</p>
      ) : (
        <ul className="mt-2 max-h-80 divide-y divide-line overflow-y-auto">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2 text-sm">
              {t.signOff ? <Avatar initials={t.signOff.initials} name={t.signOff.name} size={22} /> : <span className="w-[22px]" />}
              <span className="min-w-0 flex-1">
                <Link href={`/readiness/sites/${siteId}/workstreams/${t.workstream.id}?task=${t.id}`} className="line-clamp-1 text-ink hover:text-accent">{t.title}</Link>
                <span className="text-xs text-muted">{t.workstream.code} {t.workstream.name} · {t.signOff ? `with ${t.signOff.name}` : "no sign-off person"}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
