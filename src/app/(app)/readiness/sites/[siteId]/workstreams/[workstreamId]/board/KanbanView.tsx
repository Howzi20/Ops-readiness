"use client";
import { useState } from "react";
import type { TaskRow } from "@/modules/readiness/queries";
import { daysUntil } from "@/modules/readiness/rules";
import { parseDateInput, fmtDate } from "@/lib/dates";
import { GROUP_COLORS, STATUSES, STATUS_COLOR, STATUS_LABEL, type Status } from "@/modules/readiness/constants";
import { cx, FlagDot } from "@/components/ui";
import { AvatarStack } from "./cells";
import { flagOf, groupBySection, type BoardApi } from "./Board";

export function KanbanView({ api }: { api: BoardApi }) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<Status | null>(null);
  const [showDone, setShowDone] = useState(true);
  const groupColor = new Map(groupBySection(api.tasks).map((g, i) => [g.name, GROUP_COLORS[i % GROUP_COLORS.length]]));
  const columns = STATUSES.filter((s) => showDone || (s !== "COMPLETED" && s !== "NA"));

  return (
    <div className="pt-4">
      <label className="mb-3 flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
        Show Completed and N/A columns
      </label>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {columns.map((s) => {
          const items = api.tasks.filter((t) => t.status === s);
          return (
            <div
              key={s}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(s);
              }}
              onDragLeave={() => setOver((o) => (o === s ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                const id = e.dataTransfer.getData("text/plain") || dragId;
                const t = api.tasks.find((x) => x.id === id);
                if (t && t.status !== s) api.patch(t.id, { status: s });
                setDragId(null);
              }}
              className={cx("flex w-72 shrink-0 flex-col rounded-lg bg-[#eef1f5] transition", over === s && "ring-2 ring-accent")}
            >
              <div className="flex items-center justify-between rounded-t-lg px-3 py-2 text-sm font-semibold" style={{ background: STATUS_COLOR[s].bg, color: STATUS_COLOR[s].fg }}>
                {STATUS_LABEL[s]}
                <span className="rounded-full bg-white/25 px-2 text-xs tabular">{items.length}</span>
              </div>
              <div className="flex max-h-[calc(100vh-320px)] min-h-24 flex-col gap-2 overflow-y-auto p-2">
                {items.map((t) => (
                  <Card key={t.id} t={t} api={api} color={groupColor.get(t.section) ?? GROUP_COLORS[0]} onDragStart={() => setDragId(t.id)} dragging={dragId === t.id} />
                ))}
                {items.length === 0 && <div className="rounded border border-dashed border-line/90 py-6 text-center text-xs text-muted">Drop tasks here</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Card({ t, api, color, onDragStart, dragging }: { t: TaskRow; api: BoardApi; color: string; onDragStart: () => void; dragging: boolean }) {
  const days = daysUntil(parseDateInput(t.targetDate));
  const flag = flagOf(t);
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", t.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onClick={() => api.open(t.id)}
      className={cx(
        "cursor-grab rounded-md bg-white p-3 text-sm shadow-xs ring-1 ring-line transition hover:shadow-md active:cursor-grabbing",
        dragging && "opacity-50",
      )}
      style={{ borderTop: `3px solid ${color}` }}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-medium" style={{ color }}>{t.section || "General"}</span>
        <FlagDot flag={flag} overridden={!!t.flagOverride} />
      </div>
      <div className="line-clamp-3 text-ink">{t.title}</div>
      {t.progress > 0 && t.status !== "COMPLETED" && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-accent" style={{ width: `${t.progress}%` }} />
        </div>
      )}
      <div className="mt-2 flex items-center gap-2 text-xs text-muted">
        <AvatarStack ids={[t.ownerId, ...t.collaboratorIds]} contacts={api.contacts} />
        {t.targetDate && (
          <span className={cx("tabular", flag === "RED" && !t.flagOverride && "font-medium text-rag-red")}>
            📅 {fmtDate(t.targetDate)}
            {days !== null && days < 0 && t.status !== "COMPLETED" && t.status !== "NA" ? ` (${-days}d late)` : ""}
          </span>
        )}
        {t.updates.length > 0 && <span className="ml-auto text-accent">💬 {t.updates.length}</span>}
      </div>
    </div>
  );
}
