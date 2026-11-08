"use client";
import { useState } from "react";
import { parseDateInput, toDateInput } from "@/lib/dates";
import { STATUS_COLOR, STATUS_LABEL, type Status } from "@/modules/readiness/constants";
import { btn, cx } from "@/components/ui";
import { Popover } from "./cells";
import type { BoardApi } from "./Board";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_CHIPS = 3;

export function CalendarView({ api }: { api: BoardApi }) {
  const now = new Date();
  const [month, setMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [more, setMore] = useState<{ anchor: HTMLElement; day: string } | null>(null);

  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const gridStart = new Date(first.getFullYear(), first.getMonth(), 1 - ((first.getDay() + 6) % 7));
  const cells = Array.from({ length: 42 }, (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
  const weeksNeeded = Math.ceil((((first.getDay() + 6) % 7) + new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()) / 7);

  const byDay = new Map<string, BoardApi["tasks"]>();
  for (const t of api.tasks) if (t.targetDate) byDay.set(t.targetDate, [...(byDay.get(t.targetDate) ?? []), t]);
  const markers = new Map<string, string[]>();
  if (api.keyDates.pc) markers.set(api.keyDates.pc, ["Practical Completion"]);
  if (api.keyDates.goLive) markers.set(api.keyDates.goLive, [...(markers.get(api.keyDates.goLive) ?? []), "Go-Live"]);
  const todayKey = toDateInput(now);
  const inMonth = api.tasks.filter((t) => {
    const d = parseDateInput(t.targetDate);
    return d && d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
  }).length;

  const chip = (t: BoardApi["tasks"][number]) => {
    const c = STATUS_COLOR[t.status as Status] ?? STATUS_COLOR.TO_COMMENCE;
    return (
      <button
        key={t.id}
        onClick={() => {
          setMore(null);
          api.open(t.id);
        }}
        title={`${t.title} — ${STATUS_LABEL[t.status as Status]}`}
        className="block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium hover:brightness-95"
        style={{ background: c.bg, color: c.fg }}
      >
        {t.title}
      </button>
    );
  };

  return (
    <div className="pt-4">
      <div className="mb-3 flex items-center gap-2">
        <button className={btn.secondary} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month">‹</button>
        <button className={btn.secondary} onClick={() => setMonth(new Date(now.getFullYear(), now.getMonth(), 1))}>Today</button>
        <button className={btn.secondary} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month">›</button>
        <h3 className="ml-2 text-lg font-semibold text-ink">{month.toLocaleDateString("en-AU", { month: "long", year: "numeric" })}</h3>
        <span className="text-sm text-muted">{inMonth} task{inMonth === 1 ? "" : "s"} due</span>
      </div>
      <div className="overflow-hidden rounded-lg bg-white ring-1 ring-line">
        <div className="grid grid-cols-7 border-b border-line bg-canvas text-center text-xs font-medium text-muted">
          {WEEKDAYS.map((d) => <div key={d} className="py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {cells.slice(0, weeksNeeded * 7).map((d) => {
            const key = toDateInput(d);
            const list = byDay.get(key) ?? [];
            const out = d.getMonth() !== month.getMonth();
            const weekend = d.getDay() === 0 || d.getDay() === 6;
            return (
              <div
                key={key}
                className={cx("min-h-28 border-b border-r border-line p-1.5 [&:nth-child(7n)]:border-r-0", out && "bg-canvas/60", weekend && !out && "bg-canvas/30")}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={cx(
                      "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs tabular",
                      key === todayKey ? "bg-accent font-semibold text-white" : out ? "text-muted/60" : "text-ink",
                    )}
                  >
                    {d.getDate()}
                  </span>
                  {markers.get(key)?.map((m) => (
                    <span key={m} className="rounded bg-ink px-1.5 text-[10px] font-medium text-white">{m === "Practical Completion" ? "PC" : m}</span>
                  ))}
                </div>
                <div className="space-y-0.5">
                  {list.slice(0, MAX_CHIPS).map(chip)}
                  {list.length > MAX_CHIPS && (
                    <button className="w-full rounded px-1.5 text-left text-[11px] font-medium text-muted hover:bg-canvas hover:text-ink" onClick={(e) => setMore({ anchor: e.currentTarget, day: key })}>
                      +{list.length - MAX_CHIPS} more
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {more && (
        <Popover anchor={more.anchor} onClose={() => setMore(null)} width={260}>
          <div className="px-1 pb-1 text-xs font-semibold text-muted">
            {parseDateInput(more.day)?.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}
          </div>
          <div className="max-h-72 space-y-0.5 overflow-y-auto">{(byDay.get(more.day) ?? []).map(chip)}</div>
        </Popover>
      )}
    </div>
  );
}
