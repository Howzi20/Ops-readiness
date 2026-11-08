"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { TaskRow } from "@/modules/readiness/queries";
import { updateTask, type TaskPatch } from "@/modules/readiness/actions";
import { computeFlag } from "@/modules/readiness/rules";
import { parseDateInput } from "@/lib/dates";
import { PHASES, PHASE_LABEL, STATUSES, STATUS_LABEL, type Flag } from "@/modules/readiness/constants";
import { btn, cx, field } from "@/components/ui";
import type { Contact } from "./cells";
import { TableView } from "./TableView";
import { BucketView } from "./BucketView";
import { TimelineView } from "./TimelineView";
import { CalendarView } from "./CalendarView";
import { TaskPanel } from "./TaskPanel";

/** Single-person roles on a task. Collaborators are a separate list. */
export const PEOPLE = [
  ["ownerId", "Owner"],
  ["signOffId", "Approver"],
] as const;

export function involves(t: TaskRow, contactId: string) {
  return t.ownerId === contactId || t.signOffId === contactId || t.collaboratorIds.includes(contactId);
}

export function flagOf(t: TaskRow): Flag {
  return computeFlag({ ...t, targetDate: parseDateInput(t.targetDate) });
}

export type BoardApi = {
  tasks: TaskRow[];
  contacts: Contact[];
  workstreamId: string;
  patch: (id: string, p: TaskPatch) => Promise<boolean>;
  open: (id: string) => void;
  openId: string | null;
  setError: (e: string) => void;
  filtered: boolean;
  keyDates: { pc: string; goLive: string };
};

const VIEWS = [
  ["table", "Table", "▦"],
  ["bucket", "Bucket", "▥"],
  ["timeline", "Timeline", "▬"],
  ["calendar", "Calendar", "▣"],
] as const;
type View = (typeof VIEWS)[number][0];

const EMPTY_FILTERS = { q: "", phase: "", status: "", flag: "", person: "" };

export function Board({
  workstreamId,
  initialTasks,
  contacts,
  keyDates,
  userName,
}: {
  workstreamId: string;
  initialTasks: TaskRow[];
  contacts: Contact[];
  keyDates: { pc: string; goLive: string };
  userName: string;
}) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const view = (VIEWS.some(([v]) => v === sp.get("view")) ? sp.get("view") : "table") as View;
  const setView = (v: View) => {
    const next = new URLSearchParams(sp);
    next.set("view", v);
    router.replace(`${path}?${next}`, { scroll: false });
  };

  const [tasks, setTasks] = useState(initialTasks);
  const [openId, setOpenId] = useState<string | null>(sp.get("task"));
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  useEffect(() => setTasks(initialTasks), [initialTasks]);
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(t);
  }, [error]);

  const patch = useCallback(
    async (id: string, p: TaskPatch) => {
      let before: TaskRow | undefined;
      setTasks((ts) =>
        ts.map((t) => {
          if (t.id !== id) return t;
          before = t;
          const next = { ...t, ...(p as Partial<TaskRow>) };
          if (p.status === "COMPLETED") next.progress = 100;
          return next;
        }),
      );
      const r = await updateTask(id, p);
      if (!r.ok) {
        if (before) setTasks((ts) => ts.map((t) => (t.id === id ? before! : t)));
        setError(r.error);
        return false;
      }
      // the server may route the task to Awaiting approval: mirror what it saved
      setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status: r.status ?? t.status, progress: r.progress ?? t.progress } : t)));
      return true;
    },
    [],
  );

  const visible = useMemo(() => {
    const q = filters.q.toLowerCase();
    return tasks.filter((t) => {
      if (q && !t.title.toLowerCase().includes(q) && !t.notes.toLowerCase().includes(q) && !t.updates.some((u) => u.body.toLowerCase().includes(q))) return false;
      if (filters.phase && t.phase !== filters.phase) return false;
      if (filters.status && t.status !== filters.status) return false;
      if (filters.flag && flagOf(t) !== filters.flag) return false;
      if (filters.person && !involves(t, filters.person)) return false;
      return true;
    });
  }, [tasks, filters]);

  const filtered = Object.values(filters).some(Boolean);
  const api: BoardApi = { tasks: visible, contacts, workstreamId, patch, open: setOpenId, openId, setError, filtered, keyDates };
  const openTask = tasks.find((t) => t.id === openId) ?? null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
        <div className="flex rounded-lg bg-white p-0.5 shadow-xs ring-1 ring-line" role="tablist">
          {VIEWS.map(([v, l, icon]) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={cx(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm",
                view === v ? "bg-accent-soft font-medium text-accent-strong" : "text-muted hover:text-ink",
              )}
            >
              <span aria-hidden className="text-xs">{icon}</span>
              {l}
            </button>
          ))}
        </div>
        <div className="mx-1 h-6 w-px bg-line" />
        <input placeholder="Search…" className={field + " w-40"} value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
        <select aria-label="Person filter" className={field + " w-auto"} value={filters.person} onChange={(e) => setFilters({ ...filters, person: e.target.value })}>
          <option value="">👤 Anyone</option>
          {contacts.map((c) => <option key={c.id} value={c.id}>{c.initials} — {c.name}</option>)}
        </select>
        <select aria-label="Status filter" className={field + " w-auto"} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <select aria-label="Flag filter" className={field + " w-auto"} value={filters.flag} onChange={(e) => setFilters({ ...filters, flag: e.target.value })}>
          <option value="">All flags</option>
          <option value="RED">Red</option>
          <option value="YELLOW">Yellow</option>
          <option value="GREEN">Green</option>
        </select>
        <select aria-label="Phase filter" className={field + " w-auto"} value={filters.phase} onChange={(e) => setFilters({ ...filters, phase: e.target.value })}>
          <option value="">All phases</option>
          {PHASES.map((p) => <option key={p} value={p}>{PHASE_LABEL[p]}</option>)}
        </select>
        {filtered && <button className={btn.ghost} onClick={() => setFilters(EMPTY_FILTERS)}>Clear</button>}
        <span className="ml-auto text-sm text-muted tabular">{visible.length} of {tasks.length} tasks</span>
      </div>

      {error && (
        <div role="alert" className="fixed bottom-4 left-1/2 z-[70] -translate-x-1/2 rounded-md bg-rag-red px-4 py-2 text-sm text-white shadow-lg">
          Not saved: {error}
        </div>
      )}

      {view === "table" && <TableView api={api} />}
      {view === "bucket" && <BucketView api={api} />}
      {view === "timeline" && <TimelineView api={api} />}
      {view === "calendar" && <CalendarView api={api} />}

      {openTask && (
        <TaskPanel
          key={openTask.id}
          task={openTask}
          contacts={contacts}
          userName={userName}
          onClose={() => setOpenId(null)}
          patch={(p) => patch(openTask.id, p)}
          onUpdatesChange={(updates) => setTasks((ts) => ts.map((t) => (t.id === openTask.id ? { ...t, updates } : t)))}
          onLocalChange={(p) => setTasks((ts) => ts.map((t) => (t.id === openTask.id ? { ...t, ...p } : t)))}
          onDeleted={() => {
            setTasks((ts) => ts.filter((t) => t.id !== openTask.id));
            setOpenId(null);
          }}
          setError={setError}
        />
      )}
    </>
  );
}

/** Group tasks by section, keeping first-seen order. */
export function groupBySection(tasks: TaskRow[]) {
  const out: { name: string; tasks: TaskRow[] }[] = [];
  const idx = new Map<string, number>();
  for (const t of tasks) {
    const i = idx.get(t.section);
    if (i === undefined) {
      idx.set(t.section, out.length);
      out.push({ name: t.section, tasks: [t] });
    } else out[i].tasks.push(t);
  }
  return out;
}
