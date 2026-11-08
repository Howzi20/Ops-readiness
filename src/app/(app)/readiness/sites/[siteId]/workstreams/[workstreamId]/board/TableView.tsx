"use client";
import { useEffect, useState } from "react";
import type { TaskRow } from "@/modules/readiness/queries";
import { addTask } from "@/modules/readiness/actions";
import { completion } from "@/modules/readiness/rules";
import { fmtDate } from "@/lib/dates";
import { GROUP_COLORS } from "@/modules/readiness/constants";
import { btn, cx, FlagDot, input } from "@/components/ui";
import { AvatarStack, PersonCell, PriorityCell, StatusBar, StatusCell } from "./cells";
import { flagOf, groupBySection, PEOPLE, type BoardApi } from "./Board";

const COLLAPSE_KEY = "opsr.collapsed.";

export function TableView({ api }: { api: BoardApi }) {
  const groups = groupBySection(api.tasks);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      setCollapsed(JSON.parse(localStorage.getItem(COLLAPSE_KEY + api.workstreamId) ?? "{}"));
    } catch {}
  }, [api.workstreamId]);
  const toggle = (name: string) => {
    const next = { ...collapsed, [name]: !collapsed[name] };
    setCollapsed(next);
    try {
      localStorage.setItem(COLLAPSE_KEY + api.workstreamId, JSON.stringify(next));
    } catch {}
  };
  const allCollapsed = groups.length > 0 && groups.every((g) => collapsed[g.name]);

  return (
    <div className="space-y-6 pt-4">
      {groups.length > 1 && (
        <button
          className={btn.ghost}
          onClick={() => {
            const next = Object.fromEntries(groups.map((g) => [g.name, !allCollapsed]));
            setCollapsed(next);
            try {
              localStorage.setItem(COLLAPSE_KEY + api.workstreamId, JSON.stringify(next));
            } catch {}
          }}
        >
          {allCollapsed ? "Expand all groups" : "Collapse all groups"}
        </button>
      )}
      {groups.map((g, gi) => (
        <Group
          key={g.name + gi}
          name={g.name}
          tasks={g.tasks}
          color={GROUP_COLORS[gi % GROUP_COLORS.length]}
          collapsed={!!collapsed[g.name]}
          onToggle={() => toggle(g.name)}
          api={api}
        />
      ))}
      {groups.length === 0 && (
        <div className="rounded-lg border border-dashed border-line bg-white px-6 py-10 text-center text-sm text-muted">
          {api.filtered ? "No tasks match these filters." : "No tasks yet. Add a group to get started."}
        </div>
      )}
      {!api.filtered && <AddGroup api={api} />}
    </div>
  );
}

function Group({
  name,
  tasks,
  color,
  collapsed,
  onToggle,
  api,
}: {
  name: string;
  tasks: TaskRow[];
  color: string;
  collapsed: boolean;
  onToggle: () => void;
  api: BoardApi;
}) {
  const counts: Record<string, number> = {};
  for (const t of tasks) counts[t.status] = (counts[t.status] ?? 0) + 1;
  const done = completion(tasks);
  const dates = tasks.map((t) => t.targetDate).filter(Boolean).sort();
  const red = tasks.filter((t) => flagOf(t) === "RED").length;
  const yellow = tasks.filter((t) => flagOf(t) === "YELLOW").length;

  return (
    <section>
      <button onClick={onToggle} className="mb-1.5 flex items-center gap-2 text-left" aria-expanded={!collapsed}>
        <span className="text-xs transition" style={{ color, transform: collapsed ? "rotate(-90deg)" : undefined }}>▼</span>
        <span className="text-[15px] font-semibold" style={{ color }}>{name || "General"}</span>
        <span className="text-xs text-muted tabular">{tasks.length} task{tasks.length === 1 ? "" : "s"}</span>
        {collapsed && (
          <span className="ml-3 flex w-48 items-center gap-2">
            <StatusBar counts={counts} total={tasks.length} height={6} />
          </span>
        )}
      </button>

      {!collapsed && (
        <div className="overflow-x-auto rounded-lg bg-white shadow-xs ring-1 ring-line" style={{ borderLeft: `5px solid ${color}` }}>
          <table className="w-full min-w-[1000px] border-collapse text-sm">
            <thead>
              <tr className="text-xs text-muted">
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
      )}
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
