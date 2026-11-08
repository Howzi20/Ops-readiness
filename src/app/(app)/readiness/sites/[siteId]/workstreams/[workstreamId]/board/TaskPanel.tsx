"use client";
import { useEffect, useState } from "react";
import type { TaskRow } from "@/modules/readiness/queries";
import { addTaskUpdate, approveSignOff, deleteTask, deleteTaskUpdate, returnSignOff, type TaskPatch } from "@/modules/readiness/actions";
import { computeFlag } from "@/modules/readiness/rules";
import { parseDateInput } from "@/lib/dates";
import { DOCUMENTED, DOCUMENTED_LABEL, PHASES, PHASE_LABEL, type Flag } from "@/modules/readiness/constants";
import { btn, cx, FlagPill, input, label } from "@/components/ui";
import { Avatar } from "@/components/Avatar";
import { CollaboratorsCell, PersonCell, PriorityCell, StatusCell, type Contact } from "./cells";
import { PEOPLE } from "./Board";

const POSTING_AS_KEY = "opsr.postingAs";

function initialsOf(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
}

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

export function TaskPanel({
  task,
  contacts,
  userName,
  onClose,
  patch,
  onUpdatesChange,
  onLocalChange,
  onDeleted,
  setError,
}: {
  task: TaskRow;
  contacts: Contact[];
  userName: string;
  onClose: () => void;
  patch: (p: TaskPatch) => Promise<boolean>;
  onUpdatesChange: (u: TaskRow["updates"]) => void;
  onLocalChange: (p: Partial<TaskRow>) => void;
  onDeleted: () => void;
  setError: (e: string) => void;
}) {
  const [tab, setTab] = useState<"updates" | "details">("updates");
  const [title, setTitle] = useState(task.title);
  const [section, setSection] = useState(task.section);
  const [notes, setNotes] = useState(task.notes);
  const [override, setOverride] = useState(task.flagOverride ?? "");
  const [overrideNote, setOverrideNote] = useState(task.overrideNote);
  const [progress, setProgress] = useState(task.progress);
  const [draft, setDraft] = useState("");
  const [postingAs, setPostingAs] = useState(userName);
  const [posting, setPosting] = useState(false);
  useEffect(() => setProgress(task.progress), [task.progress]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(POSTING_AS_KEY);
      if (saved) setPostingAs(saved);
    } catch {}
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !(e.target as HTMLElement).closest("[role=menu]") && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const autoFlag = computeFlag({ ...task, flagOverride: null, targetDate: parseDateInput(task.targetDate) });
  const overrideDirty = override !== (task.flagOverride ?? "") || (override && overrideNote !== task.overrideNote);

  async function post() {
    setPosting(true);
    const r = await addTaskUpdate(task.id, draft, postingAs);
    setPosting(false);
    if (!r.ok) return setError(r.error);
    if (r.update) onUpdatesChange([r.update, ...task.updates]);
    setDraft("");
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink/25" onClick={onClose}>
      <aside className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-line px-5 pt-4">
          <div className="flex items-start justify-between gap-3">
            <textarea
              aria-label="Task title"
              rows={2}
              className="w-full resize-none rounded border border-transparent px-1 text-lg font-semibold text-ink hover:border-line focus:border-accent focus:outline-none"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => title.trim() && title !== task.title && patch({ title })}
            />
            <button className={btn.ghost} onClick={onClose} aria-label="Close">✕</button>
          </div>
          <div className="mt-2 grid grid-cols-[1fr_7rem] overflow-hidden rounded-md border border-line text-sm">
            <StatusCell value={task.status} onChange={(status) => patch({ status })} />
            <PriorityCell long value={task.priority} onChange={(priority) => patch({ priority })} />
          </div>
          <SignOffBanner
            task={task}
            contacts={contacts}
            actingAs={postingAs}
            setError={setError}
            onApproved={(update, signedOffAt) => {
              onLocalChange({ status: "COMPLETED", progress: 100, signedOffAt, signedOffBy: update.authorName });
              onUpdatesChange([update, ...task.updates]);
            }}
            onReturned={(update) => {
              onLocalChange({ status: "IN_PROGRESS", progress: 90 });
              onUpdatesChange([update, ...task.updates]);
              setTab("updates");
            }}
          />
          <div className="mt-3 flex gap-4">
            {(["updates", "details"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cx("-mb-px border-b-2 pb-2 text-sm capitalize", tab === t ? "border-accent font-medium text-ink" : "border-transparent text-muted hover:text-ink")}
              >
                {t}
                {t === "updates" && task.updates.length > 0 && <span className="ml-1.5 rounded-full bg-accent-soft px-1.5 text-xs text-accent-strong">{task.updates.length}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === "updates" ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-line p-3 focus-within:border-accent">
                <textarea
                  aria-label="Write an update"
                  rows={3}
                  className="w-full resize-none text-sm outline-none"
                  placeholder="Write an update… (Ctrl/⌘ + Enter to post)"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && draft.trim() && post()}
                />
                <div className="mt-2 flex items-center gap-2 border-t border-line pt-2">
                  <span className="text-xs text-muted">Posting as</span>
                  <select
                    aria-label="Posting as"
                    className="rounded border border-line px-1.5 py-0.5 text-xs"
                    value={postingAs}
                    onChange={(e) => {
                      setPostingAs(e.target.value);
                      try {
                        localStorage.setItem(POSTING_AS_KEY, e.target.value);
                      } catch {}
                    }}
                  >
                    <option value={userName}>{userName}</option>
                    {contacts.filter((c) => c.name !== userName).map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                  <button className={btn.primary + " ml-auto"} disabled={!draft.trim() || posting} onClick={post}>
                    {posting ? "Posting…" : "Update"}
                  </button>
                </div>
              </div>

              {task.updates.length === 0 && !task.notes && (
                <p className="py-6 text-center text-sm text-muted">No updates yet. Post progress, blockers or decisions here so the history stays with the task.</p>
              )}
              {task.updates.map((u) => {
                const c = contacts.find((x) => x.name === u.authorName);
                return (
                  <article key={u.id} className="group rounded-lg border border-line p-3">
                    <header className="mb-1.5 flex items-center gap-2">
                      <Avatar initials={c?.initials ?? initialsOf(u.authorName)} name={u.authorName} size={26} />
                      <span className="text-sm font-medium text-ink">{u.authorName}</span>
                      <span className="text-xs text-muted" title={new Date(u.createdAt).toLocaleString("en-AU")}>{timeAgo(u.createdAt)}</span>
                      <button
                        className="ml-auto text-xs text-muted opacity-0 hover:text-rag-red group-hover:opacity-100"
                        onClick={async () => {
                          if (!confirm("Delete this update?")) return;
                          const r = await deleteTaskUpdate(u.id);
                          if (r.ok) onUpdatesChange(task.updates.filter((x) => x.id !== u.id));
                          else setError(r.error);
                        }}
                      >
                        Delete
                      </button>
                    </header>
                    <p className="whitespace-pre-line text-sm text-ink-soft">{u.body}</p>
                  </article>
                );
              })}
              {task.notes && (
                <article className="rounded-lg border border-dashed border-line p-3">
                  <header className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Description / earlier notes</header>
                  <p className="whitespace-pre-line text-sm text-ink-soft">{task.notes}</p>
                </article>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Group (section)</label>
                  <input className={input} value={section} onChange={(e) => setSection(e.target.value)} onBlur={() => section !== task.section && patch({ section })} />
                </div>
                <div>
                  <label className={label}>Phase</label>
                  <select className={input} value={task.phase} onChange={(e) => patch({ phase: e.target.value as (typeof PHASES)[number] })}>
                    {PHASES.map((p) => <option key={p} value={p}>{PHASE_LABEL[p]}</option>)}
                  </select>
                </div>
                <div>
                  <label className={label}>Start date</label>
                  <input type="date" className={input} value={task.startDate} onChange={(e) => patch({ startDate: e.target.value || null })} />
                </div>
                <div>
                  <label className={label}>Target date</label>
                  <input type="date" className={input} value={task.targetDate} onChange={(e) => patch({ targetDate: e.target.value || null })} />
                </div>
                <div>
                  <label className={label}>Documented?</label>
                  <select className={input} value={task.documented} onChange={(e) => patch({ documented: e.target.value as (typeof DOCUMENTED)[number] })}>
                    {DOCUMENTED.map((d) => <option key={d} value={d}>{DOCUMENTED_LABEL[d]}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={label}>Progress — {progress}%</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={progress}
                  className="w-full"
                  onChange={(e) => setProgress(Number(e.target.value))}
                  onPointerUp={() => progress !== task.progress && patch({ progress })}
                  onKeyUp={() => progress !== task.progress && patch({ progress })}
                />
              </div>

              <div>
                <label className={label}>People</label>
                <div className="grid grid-cols-2 overflow-hidden rounded-md border border-line">
                  {PEOPLE.map(([k, role]) => (
                    <div key={k} className="border-r border-line text-center last:border-r-0">
                      <div className="border-b border-line bg-canvas py-1 text-[11px] font-medium text-muted">
                        {role === "Owner" ? "Owner — manages the task" : "Approver — approves completion"}
                      </div>
                      <PersonCell value={task[k]} contacts={contacts} role={role} onChange={(id) => patch({ [k]: id })} />
                      <div className="truncate px-1 pb-1 text-[11px] text-muted">{contacts.find((c) => c.id === task[k])?.name ?? "—"}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-2">
                  <CollaboratorsCell
                    value={task.collaboratorIds}
                    contacts={contacts}
                    exclude={[task.ownerId, task.signOffId]}
                    onChange={(ids) => patch({ collaboratorIds: ids })}
                  />
                </div>
                {!task.signOffId && (
                  <p className="mt-1 text-xs text-muted">No approver: the owner can mark this task Completed directly.</p>
                )}
              </div>

              <div>
                <label className={label}>Description</label>
                <textarea rows={3} className={input} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== task.notes && patch({ notes })} />
              </div>

              <div className="rounded-md border border-line p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-ink">Flag</span>
                  <span className="flex items-center gap-2 text-xs text-muted">Automatic: <FlagPill flag={autoFlag} /></span>
                </div>
                <select className={input} value={override} onChange={(e) => setOverride(e.target.value)}>
                  <option value="">Use automatic flag</option>
                  <option value="RED">Override → Red</option>
                  <option value="YELLOW">Override → Yellow</option>
                  <option value="GREEN">Override → Green</option>
                </select>
                {override && (
                  <textarea rows={2} className={input + " mt-2"} placeholder="Reason for override (required)" value={overrideNote} onChange={(e) => setOverrideNote(e.target.value)} />
                )}
                {overrideDirty && (
                  <button className={btn.primary + " mt-2"} onClick={() => patch({ flagOverride: (override || null) as Flag | null, overrideNote })}>
                    Save flag
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-line pt-3 text-xs text-muted">
                <span>
                  Last updated {task.updatedBy ? `by ${task.updatedBy} ` : ""}
                  {new Date(task.updatedAt).toLocaleString("en-AU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
                <button
                  className="text-rag-red hover:underline"
                  onClick={async () => {
                    if (!confirm("Delete this task?")) return;
                    const r = await deleteTask(task.id);
                    if (r.ok) onDeleted();
                    else setError(r.error);
                  }}
                >
                  Delete task
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function SignOffBanner({
  task,
  contacts,
  actingAs,
  setError,
  onApproved,
  onReturned,
}: {
  task: TaskRow;
  contacts: Contact[];
  actingAs: string;
  setError: (e: string) => void;
  onApproved: (u: TaskRow["updates"][number], signedOffAt: string) => void;
  onReturned: (u: TaskRow["updates"][number]) => void;
}) {
  const [returning, setReturning] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const signer = contacts.find((c) => c.id === task.signOffId);
  const name = signer?.name ?? actingAs;
  const now = () => new Date().toISOString();

  if (task.status === "COMPLETED" && task.signedOffAt) {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-md bg-rag-green-soft px-3 py-2 text-sm text-ink">
        <span aria-hidden>✅</span>
        Approved by <strong className="font-semibold">{task.signedOffBy}</strong> on{" "}
        {new Date(task.signedOffAt).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" })}
      </div>
    );
  }
  if (task.status !== "AWAITING_SIGNOFF") return null;

  return (
    <div className="mt-2 rounded-md border border-[#7b5cc4]/40 bg-[#f3effb] px-3 py-2.5 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-ink">
          Waiting for approval from <strong className="font-semibold">{signer?.name ?? "the approver"}</strong>
        </span>
        {!returning && (
          <span className="ml-auto flex gap-2">
            <button
              className="rounded-md px-3 py-1.5 text-sm font-medium text-white hover:brightness-95 disabled:opacity-50"
              style={{ background: "#1f8f7a" }}
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const r = await approveSignOff(task.id, name);
                setBusy(false);
                if (!r.ok) return setError(r.error);
                onApproved({ id: "local-" + Date.now(), authorName: name, body: "✅ Approved — task completed.", createdAt: now() }, r.signedOffAt ?? now());
              }}
            >
              Approve
            </button>
            <button className={btn.secondary} disabled={busy} onClick={() => setReturning(true)}>
              Return
            </button>
          </span>
        )}
      </div>
      {returning && (
        <div className="mt-2 space-y-2">
          <textarea
            autoFocus
            rows={2}
            className={input}
            placeholder="What still needs doing? (required)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              className={btn.primary}
              disabled={!reason.trim() || busy}
              onClick={async () => {
                setBusy(true);
                const r = await returnSignOff(task.id, name, reason);
                setBusy(false);
                if (!r.ok) return setError(r.error);
                onReturned({ id: "local-" + Date.now(), authorName: name, body: `↩️ Returned for more work: ${reason.trim()}`, createdAt: now() });
                setReturning(false);
                setReason("");
              }}
            >
              Send back to owner
            </button>
            <button className={btn.ghost} onClick={() => setReturning(false)}>Cancel</button>
          </div>
        </div>
      )}
      <p className="mt-1 text-xs text-muted">Approving as {name}</p>
    </div>
  );
}
