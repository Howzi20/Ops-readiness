"use client";
import { useEffect, useState } from "react";
import type { TaskRow } from "@/modules/readiness/queries";
import { addTask } from "@/modules/readiness/actions";
import { completion, daysUntil, groupHealth, type GroupHealth } from "@/modules/readiness/rules";
import { fmtDate, parseDateInput } from "@/lib/dates";
import { GROUP_COLORS } from "@/modules/readiness/constants";
import { btn, cx, FlagDot, input } from "@/components/ui";
import { AvatarStack, PersonCell, PriorityCell, StatusBar, StatusCell } from "./cells";
import { flagOf, groupBySection, PEOPLE, type BoardApi } from "./Board";

const OPEN_KEY = "opsr.openGroups.";

const HEALTH: Record<GroupHealth, { label: string; bg: string; fg: string }> = {
  COMPLETE: { label: "Complete", bg: "#e3f3ef", fg: "#17705f" },
  OVERDUE: { label: "Overdue", bg: "#fdecec", fg: "#b8323d" },
  AWAITING: { label: "Awaiting approval", bg: "#f0ebfa", fg: "#5f43a6" },
  DUE_SOON: { label: "Due soon", bg: "#fdf5e0", fg: "#8a6208" },
  NOT_STARTED: { label: "Not started", bg: "#eef1f5", fg: "#56657a" },
  ON_TRACK: { label: "On track", bg: "#e3f3ef", fg: "#17705f" },
  EMPTY: { label: "All N/A", bg: "#eef1f5", fg: "#56657a" },
};

export function TableView({ api }: { api: BoardApi }) {
  const groups = groupBySection(api.tasks);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      setOpen(JSON.parse(localStorage.getItem(OPEN_KEY + api.workstreamId) ?? "{}"));
    } catch {}
  }, [api.workstreamId]);
  const save = (next: Record<string, boolean>) => {
    setOpen(next);
    try {
      localStorage.setItem(OPEN_KEY + api.workstreamId, JSON.stringify(next));
    } catch {}
  };
  // while searching or filtering, every group with a match is shown open
  const isOpen = (name: string) => api.filtered || !!open[name];
  const allOpen = groups.length > 0 && groups.every((g) => open[g.name]);

  return (
    <div className="space-y-4 pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted">
          {groups.length} group{groups.length === 1 ? "" : "s"} · click a tile to see its tasks
        </span>
        {groups.length > 1 && !api.filtered && (
          <button className={btn.ghost} onClick={() => save(Object.fromEntries(groups.map((g) => [g.name, !allOpen])))}>
            {allOpen ? "Collapse all" : "Expand all"}
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {groups.map((g, gi) => (
          <GroupTile
            key={g.name + gi}
            name={g.name}
            tasks={g.tasks}
            color={GROUP_COLORS[gi % GROUP_COLORS.length]}
            open={isOpen(g.name)}
            onToggle={() => save({ ...open, [g.name]: !open[g.name] })}
            api={api}
          />
        ))}
      </div>

      {groups.length === 0 && (
        <div className="rounded-lg border border-dashed border-line bg-white px-6 py-10 text-center text-sm text-muted">
          {api.filtered ? "No tasks match these filters." : "No tasks yet. Add a group to get started."}
        </div>
      )}
      {!api.filtered && <AddGroup api={api} />}
    </div>
  );
}

/** Progress ring with the percentage in the middle. */
function Ring({ value, color, size = 64 }: { value: number | null; color: string; size?: number }) {
  const stroke = Math.max(5, size / 11);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value ?? 0));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${Math.round(v)}% complete`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e7ee" strokeWidth={stroke} />
      {v > 0 && <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${(v / 100) * c} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />}
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize={size * 0.24} fontWeight={600} fill="#0f1d2b">
        {value === null ? "—" : `${Math.round(v)}%`}
      </text>
    </svg>
  );
}

function GroupTile({
  name,
  tasks,
  color,
  open,
  onToggle,
  api,
}: {
  name: string;
  tasks: TaskRow[];
  color: string;
  open: boolean;
  onToggle: () => void;
  api: BoardApi;
}) {
  const counts: Record<string, number> = {};
  for (const t of tasks) counts[t.status] = (counts[t.status] ?? 0) + 1;
  const done = completion(tasks);
  const dates = tasks.map((t) => t.targetDate).filter(Boolean).sort();
  const red = tasks.filter((t) => flagOf(t) === "RED").length;
  const yellow = tasks.filter((t) => flagOf(t) === "YELLOW").length;
  const withDates = tasks.map((t) => ({ ...t, targetDate: parseDateInput(t.targetDate) }));
  const health = HEALTH[groupHealth(withDates)];
  const openCount = tasks.filter((t) => t.status !== "COMPLETED" && t.status !== "NA").length;
  const overdue = withDates.filter((t) => t.status !== "COMPLETED" && t.status !== "NA" && (daysUntil(t.targetDate) ?? 0) < 0).length;
  const label = name || "General";

  const chip = (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ background: health.bg, color: health.fg }}>
      {health.label}
    </span>
  );

  if (!open) {
    return (
      <button
        onClick={onToggle}
        aria-expanded={false}
        aria-label={`${label}: ${done === null ? "no" : Math.round(done) + "%"} complete, ${openCount} open, ${overdue} overdue. Show tasks`}
        className="group flex flex-col rounded-xl bg-white p-4 text-left shadow-xs ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-md"
        style={{ borderTop: `4px solid ${color}` }}
      >
        <div className="flex items-center gap-4">
          <Ring value={done} color={color} />
          <div className="min-w-0 flex-1">
            <div className="line-clamp-2 font-semibold leading-snug text-ink">{label}</div>
            <div className="mt-1 text-xs text-muted tabular">
              {tasks.length} task{tasks.length === 1 ? "" : "s"}
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-4 text-sm">
          <span>
            <span className="font-semibold text-ink tabular">{openCount}</span> <span className="text-muted">open</span>
          </span>
          <span>
            <span className={cx("font-semibold tabular", overdue ? "text-rag-red" : "text-ink")}>{overdue}</span>{" "}
            <span className="text-muted">overdue</span>
          </span>
          <span className="ml-auto">{chip}</span>
        </div>
        <span className="mt-3 text-xs font-medium opacity-0 transition group-hover:opacity-100" style={{ color }}>
          Show tasks ▸
        </span>
      </button>
    );
  }

  return (
    <section className="col-span-full overflow-hidden rounded-xl bg-white shadow-xs ring-1 ring-line" style={{ borderTop: `4px solid ${color}` }}>
      <div className="flex flex-wrap items-center gap-4 px-4 py-3">
        <button
          onClick={onToggle}
          aria-expanded
          aria-label={`${label}: hide tasks`}
          disabled={api.filtered}
          className="flex min-w-0 flex-1 items-center gap-4 text-left disabled:cursor-default"
        >
          <Ring value={done} color={color} size={52} />
          <span className="min-w-0">
            <span className="block truncate text-base font-semibold text-ink">{label}</span>
            <span className="text-xs text-muted tabular">
              {tasks.length} tasks · {openCount} open · <span className={overdue ? "text-rag-red" : ""}>{overdue} overdue</span>
            </span>
          </span>
          {chip}
          <span className="w-40 shrink-0">
            <StatusBar counts={counts} total={tasks.length} />
          </span>
        </button>
        {!api.filtered && (
          <button className={btn.ghost} onClick={onToggle}>
            Hide tasks ▴
          </button>
        )}
      </div>

      <div className="overflow-x-auto border-t border-line">
        <table className="w-full min-w-[1000px] border-collapse text-sm">
          <thead>
            <tr className="bg-canvas/60 text-xs text-muted">
              <th className="border-b border-line px-3 py-2 text-left font-medium">Task</th>
              {PEOPLE.map(([k, role]) => (
                <th key={k} className="w-20 border-b border-l border-line py-2 text-center font-medium">{role}</th>
              ))}
              <th className="w-16 border-b border-l border-line py-2 text-center font-medium">Priority</th>
              <th className="w-36 border-b border-l border-line py-2 text-center font-medium">Target date</th>
              <th className="w-36 border-b border-l border-line py-2 text-center font-medium">Status</th>
              <th className="w-40 border-b border-l border-line py-2 text-center font-medium">Progress</th>
              <th className="w-12 border-b border-l border-line py-2 text-center font-medium">Flag</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <Row key={t.id} t={t} api={api} />
            ))}
            {!api.filtered && (
              <tr>
                <td colSpan={8} className="border-b border-line px-3 py-1">
                  <AddTask api={api} section={name} />
                </td>
              </tr>
            )}
            {/* group summary */}
            <tr className="bg-canvas/50 text-xs text-muted">
              <td className="px-3 py-2" />
              <td colSpan={3} className="border-l border-line" />
              <td className="border-l border-line px-2 py-2 text-center tabular">
                {dates.length ? `${fmtDate(dates[0])} – ${fmtDate(dates[dates.length - 1])}` : "—"}
              </td>
              <td className="border-l border-line px-2 py-2"><StatusBar counts={counts} total={tasks.length} /></td>
              <td className="border-l border-line px-2 py-2 text-center tabular">{done === null ? "—" : `${Math.round(done)}% avg`}</td>
              <td className="border-l border-line px-1 py-2 text-center tabular" title={`${red} red, ${yellow} yellow`}>
                {red > 0 && <span className="text-rag-red">{red}</span>}
                {red > 0 && yellow > 0 && " · "}
                {yellow > 0 && <span className="text-[#94690a]">{yellow}</span>}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Row({ t, api }: { t: TaskRow; api: BoardApi }) {
  const flag = flagOf(t);
  const overdue = flag === "RED" && !t.flagOverride;
  return (
    <tr className={cx("group hover:bg-canvas/70", api.openId === t.id && "bg-accent-soft/70", t.status === "NA" && "text-muted")}>
      <td className="border-b border-line px-3 py-1">
        <div className="flex items-center gap-2">
          <button onClick={() => api.open(t.id)} className="min-w-0 flex-1 py-1 text-left text-ink hover:text-accent" title="Open task">
            <span className={cx("line-clamp-2", t.status === "NA" && "text-muted")}>{t.title}</span>
          </button>
          {t.collaboratorIds.length > 0 && (
            <span className="shrink-0" title={`${t.collaboratorIds.length} collaborator${t.collaboratorIds.length === 1 ? "" : "s"}`}>
              <AvatarStack ids={t.collaboratorIds} contacts={api.contacts} size={18} />
            </span>
          )}
          {t.phase === "POST_PC" && <span className="shrink-0 rounded bg-line px-1.5 text-[11px] text-muted">Post-PC</span>}
          <button
            onClick={() => api.open(t.id)}
            title={t.updates.length ? `${t.updates.length} update${t.updates.length === 1 ? "" : "s"}` : "Add an update"}
            className={cx(
              "flex shrink-0 items-center gap-0.5 rounded px-1 text-xs",
              t.updates.length ? "text-accent" : "text-muted/50 opacity-0 group-hover:opacity-100",
            )}
          >
            💬{t.updates.length > 0 && <span className="tabular">{t.updates.length}</span>}
          </button>
        </div>
      </td>
      {PEOPLE.map(([k, role]) => (
        <td key={k} className="border-b border-l border-line p-0">
          <PersonCell value={t[k]} contacts={api.contacts} role={role} onChange={(id) => api.patch(t.id, { [k]: id })} />
        </td>
      ))}
      <td className="border-b border-l border-line p-0">
        <PriorityCell value={t.priority} onChange={(priority) => api.patch(t.id, { priority })} />
      </td>
      <td className="border-b border-l border-line px-1 text-center">
        <input
          aria-label="target date"
          type="date"
          className={cx(
            "w-full rounded border border-transparent bg-transparent px-1 py-1 text-center text-[13px] tabular hover:border-line focus:border-accent focus:bg-white focus:outline-none",
            overdue && "font-medium text-rag-red",
          )}
          value={t.targetDate}
          onChange={(e) => api.patch(t.id, { targetDate: e.target.value || null })}
        />
      </td>
      <td className="border-b border-l border-line p-0">
        <StatusCell value={t.status} onChange={(status) => api.patch(t.id, { status })} />
      </td>
      <td className="border-b border-l border-line px-3">
        <ProgressInput value={t.progress} onCommit={(v) => api.patch(t.id, { progress: v })} />
      </td>
      <td className="border-b border-l border-line text-center">
        <span className="inline-flex"><FlagDot flag={flag} overridden={!!t.flagOverride} /></span>
      </td>
    </tr>
  );
}

function ProgressInput({ value, onCommit }: { value: number; onCommit: (v: number) => void }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const commit = () => v !== value && onCommit(v);
  return (
    <div className="flex items-center gap-2">
      <input
        aria-label="progress"
        type="range"
        min={0}
        max={100}
        step={5}
        value={v}
        onChange={(e) => setV(Number(e.target.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
        className="h-1.5 w-full cursor-pointer"
      />
      <span className="w-9 text-right text-xs text-ink tabular">{v}%</span>
    </div>
  );
}

function AddTask({ api, section }: { api: BoardApi; section: string }) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        setBusy(true);
        const r = await addTask(api.workstreamId, section, title);
        setBusy(false);
        if (!r.ok) return api.setError(r.error);
        setTitle("");
      }}
    >
      <input
        aria-label={`Add task to ${section || "General"}`}
        disabled={busy}
        className="w-full rounded border border-transparent bg-transparent px-1 py-1 text-sm placeholder:text-muted/70 hover:border-line focus:border-accent focus:bg-white focus:outline-none"
        placeholder="+ Add task"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
    </form>
  );
}

function AddGroup({ api }: { api: BoardApi }) {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState("");
  const [title, setTitle] = useState("");
  if (!open) return <button className={btn.secondary} onClick={() => setOpen(true)}>+ Add new group</button>;
  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await addTask(api.workstreamId, section, title);
        if (!r.ok) return api.setError(r.error);
        setOpen(false);
        setSection("");
        setTitle("");
      }}
    >
      <input autoFocus className={input + " max-w-64"} placeholder="Group name" value={section} onChange={(e) => setSection(e.target.value)} />
      <input className={input + " max-w-96"} placeholder="First task in this group" value={title} onChange={(e) => setTitle(e.target.value)} />
      <button className={btn.primary} disabled={!section.trim() || !title.trim()}>Add group</button>
      <button type="button" className={btn.ghost} onClick={() => setOpen(false)}>Cancel</button>
    </form>
  );
}
