"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { parseDateInput, fmtDate } from "@/lib/dates";
import { GROUP_COLORS, STATUS_COLOR, STATUS_LABEL, type Status } from "@/modules/readiness/constants";
import { cx } from "@/components/ui";
import { groupBySection, type BoardApi } from "./Board";

const DAY = 86400000;
const ROW = 34;
const LEFT = 300;
const ZOOMS = { weeks: 26, months: 7 } as const;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const diffDays = (a: Date, b: Date) => Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / DAY);

export function TimelineView({ api }: { api: BoardApi }) {
  const [zoom, setZoom] = useState<keyof typeof ZOOMS>("weeks");
  const px = ZOOMS[zoom];
  const scroller = useRef<HTMLDivElement>(null);
  const today = startOfDay(new Date());
  const pc = parseDateInput(api.keyDates.pc);
  const goLive = parseDateInput(api.keyDates.goLive);

  const groups = groupBySection(api.tasks);
  const scheduled = api.tasks.filter((t) => t.targetDate || t.startDate);
  const unscheduled = api.tasks.length - scheduled.length;

  const { from, days } = useMemo(() => {
    const ds = [today, pc, goLive, ...scheduled.flatMap((t) => [parseDateInput(t.startDate), parseDateInput(t.targetDate)])].filter(Boolean) as Date[];
    let min = new Date(Math.min(...ds.map((d) => d.getTime())));
    let max = new Date(Math.max(...ds.map((d) => d.getTime())));
    // keep the chart a sensible size even if one date is a typo years away
    if (diffDays(today, min) > 540) min = addDays(today, -540);
    if (diffDays(max, today) > 720) max = addDays(today, 720);
    const start = addDays(min, -7 - ((min.getDay() + 6) % 7)); // back to a Monday
    return { from: start, days: diffDays(addDays(max, 21), start) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api.tasks, api.keyDates.pc, api.keyDates.goLive]);

  const x = (d: Date) => diffDays(d, from) * px;
  const width = days * px;

  useEffect(() => {
    scroller.current?.scrollTo({ left: Math.max(0, x(today) - 200) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  // header ticks
  const months: { label: string; left: number; w: number }[] = [];
  for (let d = new Date(from.getFullYear(), from.getMonth(), 1); d < addDays(from, days); d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    const s = d < from ? from : d;
    const e = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    months.push({ label: d.toLocaleDateString("en-AU", { month: "short", year: "numeric" }), left: x(s), w: diffDays(e, s) * px });
  }
  const weeks: Date[] = [];
  for (let d = from; diffDays(d, from) < days; d = addDays(d, 7)) weeks.push(d);

  const markers = [
    { d: today, label: "Today", color: "#0e7c86" },
    pc && { d: pc, label: "PC", color: "#6c72c9" },
    goLive && { d: goLive, label: "Go-Live", color: "#0f1d2b" },
  ].filter(Boolean) as { d: Date; label: string; color: string }[];

  const rows: ({ kind: "group"; name: string; color: string; count: number } | { kind: "task"; t: (typeof api.tasks)[number]; color: string })[] = [];
  groups.forEach((g, i) => {
    const color = GROUP_COLORS[i % GROUP_COLORS.length];
    rows.push({ kind: "group", name: g.name, color, count: g.tasks.length });
    for (const t of g.tasks) rows.push({ kind: "task", t, color });
  });

  return (
    <div className="pt-4">
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
        <div className="flex rounded-md bg-white p-0.5 ring-1 ring-line">
          {(Object.keys(ZOOMS) as (keyof typeof ZOOMS)[]).map((z) => (
            <button key={z} onClick={() => setZoom(z)} className={cx("rounded px-3 py-1 capitalize", zoom === z ? "bg-accent-soft font-medium text-accent-strong" : "text-muted")}>
              {z}
            </button>
          ))}
        </div>
        <button className="text-muted hover:text-accent" onClick={() => scroller.current?.scrollTo({ left: Math.max(0, x(today) - 200), behavior: "smooth" })}>
          Jump to today
        </button>
        <span className="text-muted">
          Bars run from start date to target date; ◆ = target date only (set a start date in the task&apos;s Details tab).
          {unscheduled > 0 && ` ${unscheduled} task${unscheduled === 1 ? " has" : "s have"} no dates and ${unscheduled === 1 ? "isn't" : "aren't"} shown.`}
        </span>
      </div>

      <div ref={scroller} className="relative max-h-[calc(100vh-280px)] overflow-auto rounded-lg bg-white ring-1 ring-line">
        <div style={{ width: LEFT + width }} className="relative">
          {/* header */}
          <div className="sticky top-0 z-20 flex border-b border-line bg-white">
            <div className="sticky left-0 z-30 shrink-0 border-r border-line bg-white px-3 py-2 text-xs font-medium text-muted" style={{ width: LEFT }}>
              Task
            </div>
            <div className="relative h-12" style={{ width }}>
              {months.map((m) => (
                <div key={m.label + m.left} className="absolute top-0 h-6 truncate border-l border-line px-2 pt-1 text-xs font-medium text-ink" style={{ left: m.left, width: m.w }}>
                  {m.label}
                </div>
              ))}
              {zoom === "weeks" &&
                weeks.map((w) => (
                  <div key={w.getTime()} className="absolute top-6 h-6 border-l border-line/70 px-1 pt-1 text-[11px] text-muted tabular" style={{ left: x(w) }}>
                    {w.getDate()}
                  </div>
                ))}
              {markers.map((m) => (
                <div key={m.label} className="absolute top-6 -translate-x-1/2 rounded px-1.5 text-[11px] font-medium text-white" style={{ left: x(m.d) + px / 2, background: m.color }}>
                  {m.label}
                </div>
              ))}
            </div>
          </div>

          {/* body */}
          <div className="relative">
            {/* weekend shading + marker lines */}
            <div className="pointer-events-none absolute inset-y-0 z-0" style={{ left: LEFT, width }}>
              {zoom === "weeks" &&
                weeks.map((w) => <div key={w.getTime()} className="absolute inset-y-0 bg-canvas" style={{ left: x(addDays(w, 5)), width: px * 2 }} />)}
              {markers.map((m) => (
                <div key={m.label} className="absolute inset-y-0 w-0.5" style={{ left: x(m.d) + px / 2, background: m.color, opacity: 0.7 }} />
              ))}
            </div>

            {rows.map((r, i) =>
              r.kind === "group" ? (
                <div key={"g" + i} className="relative z-10 flex border-b border-line bg-white/80" style={{ height: ROW }}>
                  <div className="sticky left-0 flex shrink-0 items-center gap-2 border-r border-line bg-white px-3 text-sm font-semibold" style={{ width: LEFT, color: r.color }}>
                    <span className="h-3 w-1 rounded" style={{ background: r.color }} />
                    <span className="truncate">{r.name || "General"}</span>
                    <span className="text-xs font-normal text-muted">{r.count}</span>
                  </div>
                </div>
              ) : (
                <TaskLine key={r.t.id} t={r.t} color={r.color} x={x} px={px} api={api} />
              ),
            )}
            {rows.length === 0 && <div className="px-4 py-10 text-center text-sm text-muted">No tasks to show.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskLine({ t, x, px, api }: { t: BoardApi["tasks"][number]; color: string; x: (d: Date) => number; px: number; api: BoardApi }) {
  const start = parseDateInput(t.startDate);
  const end = parseDateInput(t.targetDate);
  const c = STATUS_COLOR[t.status as Status] ?? STATUS_COLOR.TO_COMMENCE;
  const tip = `${t.title}\n${STATUS_LABEL[t.status as Status]} · ${t.progress}%\n${start ? fmtDate(start) + " → " : ""}${fmtDate(end)}`;
  let mark: React.ReactNode = null;
  if (start && end) {
    const left = x(start);
    const w = Math.max(px, x(end) - left + px);
    mark = (
      <button
        onClick={() => api.open(t.id)}
        title={tip}
        className="absolute top-1.5 flex h-[22px] items-center overflow-hidden rounded-full px-2 text-left text-[11px] font-medium shadow-xs hover:brightness-95"
        style={{ left, width: w, background: c.bg, color: c.fg }}
      >
        {/* progress fill */}
        <span className="pointer-events-none absolute inset-y-0 left-0 bg-white/25" style={{ width: `${t.progress}%` }} />
        <span className="relative truncate">{w > 80 ? t.title : ""}</span>
      </button>
    );
  } else {
    const d = (end ?? start)!;
    if (d)
      mark = (
        <button
          onClick={() => api.open(t.id)}
          title={tip}
          className="absolute top-[9px] h-4 w-4 rotate-45 rounded-[3px] shadow-xs ring-2 ring-white hover:scale-110"
          style={{ left: x(d) + px / 2 - 8, background: c.bg }}
        />
      );
  }
  return (
    <div className={cx("relative z-10 flex border-b border-line/60 hover:bg-accent-soft/40", api.openId === t.id && "bg-accent-soft/60")} style={{ height: ROW }}>
      <button
        onClick={() => api.open(t.id)}
        className="sticky left-0 z-10 flex shrink-0 items-center gap-2 border-r border-line bg-white px-3 text-left text-[13px] text-ink hover:text-accent"
        style={{ width: LEFT }}
        title={t.title}
      >
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.bg }} />
        <span className="truncate">{t.title}</span>
      </button>
      <div className="relative flex-1">{mark}</div>
    </div>
  );
}
