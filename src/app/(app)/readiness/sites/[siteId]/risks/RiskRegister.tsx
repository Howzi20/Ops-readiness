"use client";
import { useActionState, useEffect, useState } from "react";
import { deleteRisk, saveRisk } from "@/modules/readiness/actions";
import { RISK_LEVELS } from "@/modules/readiness/constants";
import { btn, Card, cx, Empty, input, label } from "@/components/ui";
import { fmtDate } from "@/lib/dates";

type Risk = {
  id: string; number: number; function: string; description: string; identifiedBy: string; dateRecorded: string;
  severity: string; likelihood: string; responsible: string; targetDate: string; action: string; status: string;
};

const LEVEL_STYLE: Record<string, string> = {
  HIGH: "bg-rag-red-soft text-rag-red",
  MEDIUM: "bg-rag-yellow-soft text-[#94690a]",
  LOW: "bg-rag-green-soft text-rag-green",
};
const Level = ({ v }: { v: string }) => (
  <span className={cx("rounded px-1.5 py-0.5 text-xs font-medium", LEVEL_STYLE[v])}>{v.charAt(0) + v.slice(1).toLowerCase()}</span>
);

export function RiskRegister({ siteId, risks }: { siteId: string; risks: Risk[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [showClosed, setShowClosed] = useState(false);
  const open = risks.filter((r) => r.status === "OPEN");
  const closed = risks.filter((r) => r.status === "CLOSED");
  const current = editing && editing !== "new" ? risks.find((r) => r.id === editing) ?? null : null;

  const table = (rows: Risk[]) => (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[1000px] text-sm">
        <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-3 py-2.5 font-medium">#</th>
            <th className="px-3 py-2.5 font-medium">Function</th>
            <th className="px-3 py-2.5 font-medium">Description</th>
            <th className="px-3 py-2.5 font-medium">Severity</th>
            <th className="px-3 py-2.5 font-medium">Likelihood</th>
            <th className="px-3 py-2.5 font-medium">Responsible</th>
            <th className="px-3 py-2.5 font-medium">Target</th>
            <th className="px-3 py-2.5 font-medium">Action to close</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.id} className="cursor-pointer align-top hover:bg-canvas/60" onClick={() => setEditing(r.id)}>
              <td className="px-3 py-2.5 text-muted tabular">{r.number}</td>
              <td className="px-3 py-2.5">{r.function}</td>
              <td className="max-w-xs px-3 py-2.5 text-ink">
                {r.description}
                <div className="text-xs text-muted">Raised by {r.identifiedBy || "—"} · {fmtDate(r.dateRecorded)}</div>
              </td>
              <td className="px-3 py-2.5"><Level v={r.severity} /></td>
              <td className="px-3 py-2.5"><Level v={r.likelihood} /></td>
              <td className="px-3 py-2.5">{r.responsible}</td>
              <td className="whitespace-nowrap px-3 py-2.5 tabular">{fmtDate(r.targetDate)}</td>
              <td className="max-w-sm px-3 py-2.5 text-muted"><span className="line-clamp-3 whitespace-pre-line">{r.action}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted"><span className="font-semibold text-ink tabular">{open.length}</span> open risks. Click a risk to edit.</p>
        <button className={btn.primary} onClick={() => setEditing("new")}>+ Add risk</button>
      </div>
      {open.length ? table(open) : <Empty>No open risks.</Empty>}
      {closed.length > 0 && (
        <div>
          <button className={btn.ghost} onClick={() => setShowClosed(!showClosed)}>
            {showClosed ? "▾" : "▸"} {closed.length} closed risks
          </button>
          {showClosed && <div className="mt-2 opacity-75">{table(closed)}</div>}
        </div>
      )}
      {editing && <RiskForm key={editing} siteId={siteId} risk={current} onClose={() => setEditing(null)} />}
    </div>
  );
}

function RiskForm({ siteId, risk, onClose }: { siteId: string; risk: Risk | null; onClose: () => void }) {
  const [state, action, pending] = useActionState(saveRisk.bind(null, siteId, risk?.id ?? null), undefined);
  useEffect(() => { if (state?.ok) onClose(); }, [state, onClose]);
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink/20" onClick={onClose}>
      <aside className="h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <form action={action} className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink">{risk ? `Risk #${risk.number}` : "New risk"}</h2>
            <button type="button" className={btn.ghost} onClick={onClose}>✕</button>
          </div>
          <div>
            <label className={label}>Description *</label>
            <textarea name="description" rows={2} required defaultValue={risk?.description} className={input} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Function</label><input name="function" defaultValue={risk?.function} className={input} placeholder="e.g. Operations" /></div>
            <div><label className={label}>Identified by</label><input name="identifiedBy" defaultValue={risk?.identifiedBy} className={input} /></div>
            <div>
              <label className={label}>Severity</label>
              <select name="severity" defaultValue={risk?.severity ?? "MEDIUM"} className={input}>{RISK_LEVELS.map((l) => <option key={l}>{l}</option>)}</select>
            </div>
            <div>
              <label className={label}>Likelihood</label>
              <select name="likelihood" defaultValue={risk?.likelihood ?? "MEDIUM"} className={input}>{RISK_LEVELS.map((l) => <option key={l}>{l}</option>)}</select>
            </div>
            <div><label className={label}>Responsible</label><input name="responsible" defaultValue={risk?.responsible} className={input} /></div>
            <div><label className={label}>Target date</label><input type="date" name="targetDate" defaultValue={risk?.targetDate} className={input} /></div>
            <div>
              <label className={label}>Status</label>
              <select name="status" defaultValue={risk?.status ?? "OPEN"} className={input}><option value="OPEN">Open</option><option value="CLOSED">Closed</option></select>
            </div>
          </div>
          <div>
            <label className={label}>Action to close risk / updates</label>
            <textarea name="action" rows={6} defaultValue={risk?.action} className={input} />
          </div>
          {state && !state.ok && <p className="text-sm text-rag-red">{state.error}</p>}
          <div className="flex items-center gap-2">
            <button className={btn.primary} disabled={pending}>{pending ? "Saving…" : "Save risk"}</button>
            {risk && (
              <button
                type="button"
                className={btn.danger + " ml-auto"}
                onClick={async () => { if (confirm("Delete this risk?")) { await deleteRisk(siteId, risk.id); onClose(); } }}
              >
                Delete
              </button>
            )}
          </div>
        </form>
      </aside>
    </div>
  );
}
