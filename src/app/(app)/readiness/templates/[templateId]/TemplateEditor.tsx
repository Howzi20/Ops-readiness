"use client";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  addTemplateWorkstream,
  deleteTemplate,
  deleteTemplateTask,
  deleteTemplateWorkstream,
  duplicateTemplateAction,
  saveTemplateTask,
  updateTemplate,
} from "@/modules/readiness/actions";
import { PHASES, PHASE_LABEL } from "@/modules/readiness/constants";
import { btn, Card, cx, field, input, label } from "@/components/ui";

type WS = { id: string; code: string; name: string; count: number };
type TT = { id: string; section: string; title: string; priority: number; phase: string };

export function TemplateEditor({
  template,
  workstreams,
  selected,
}: {
  template: { id: string; name: string; description: string; sites: number };
  workstreams: WS[];
  selected: { id: string; name: string; tasks: TT[] } | null;
}) {
  const [state, action, pending] = useActionState(updateTemplate.bind(null, template.id), undefined);
  const [wsState, wsAction] = useActionState(addTemplateWorkstream.bind(null, template.id), undefined);
  const wsForm = useRef<HTMLFormElement>(null);
  useEffect(() => { if (wsState?.ok) wsForm.current?.reset(); }, [wsState]);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
      <div className="space-y-4">
        <Card className="p-4">
          <form action={action} className="space-y-2">
            <label className={label}>Name</label>
            <input name="name" defaultValue={template.name} className={input} />
            <label className={label}>Description</label>
            <textarea name="description" rows={3} defaultValue={template.description} className={input} />
            <div className="flex items-center gap-2">
              <button className={btn.secondary} disabled={pending}>Save</button>
              {state?.ok && <span className="text-xs text-rag-green">Saved</span>}
              {state && !state.ok && <span className="text-xs text-rag-red">{state.error}</span>}
            </div>
          </form>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
            <button className={btn.secondary} onClick={() => duplicateTemplateAction(template.id)}>Duplicate</button>
            <button
              className={btn.danger}
              onClick={() => confirm(`Delete template "${template.name}"? Sites already created from it are not affected.`) && deleteTemplate(template.id)}
            >
              Delete
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">Used by {template.sites} site{template.sites === 1 ? "" : "s"} (they keep their own copy).</p>
        </Card>

        <Card className="p-2">
          <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted">Workstreams</div>
          {workstreams.map((w) => (
            <Link
              key={w.id}
              href={`?ws=${w.id}`}
              scroll={false}
              className={cx(
                "flex items-center justify-between rounded px-2 py-1.5 text-sm",
                selected?.id === w.id ? "bg-accent-soft font-medium text-ink" : "hover:bg-canvas",
              )}
            >
              <span className="truncate"><span className="mr-1.5 text-muted tabular">{w.code}</span>{w.name}</span>
              <span className="text-xs text-muted tabular">{w.count}</span>
            </Link>
          ))}
          <form ref={wsForm} action={wsAction} className="mt-2 flex gap-1 border-t border-line p-2">
            <input name="code" placeholder="#" className={field + " w-12"} />
            <input name="name" placeholder="New workstream" className={input} />
            <button className={btn.secondary}>+</button>
          </form>
          {wsState && !wsState.ok && <p className="px-2 text-xs text-rag-red">{wsState.error}</p>}
        </Card>
      </div>

      <div>
        {error && <p className="mb-2 text-sm text-rag-red">{error}</p>}
        {selected ? (
          <TemplateTasks key={selected.id} templateId={template.id} ws={selected} onError={setError} />
        ) : (
          <Card className="p-8 text-center text-sm text-muted">Add a workstream to start building this template.</Card>
        )}
      </div>
    </div>
  );
}

function TemplateTasks({ templateId, ws, onError }: { templateId: string; ws: { id: string; name: string; tasks: TT[] }; onError: (e: string | null) => void }) {
  const [draft, setDraft] = useState<TT>({ id: "", section: ws.tasks.at(-1)?.section ?? "", title: "", priority: 2, phase: "PRE_PC" });
  const save = async (t: TT) => {
    const r = await saveTemplateTask(templateId, ws.id, t.id || null, { title: t.title, section: t.section, priority: t.priority, phase: t.phase as "PRE_PC" });
    onError(r.ok ? null : r.error);
    return r.ok;
  };
  const sections = [...new Set(ws.tasks.map((t) => t.section))];
  return (
    <Card className="overflow-x-auto">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="font-semibold text-ink">{ws.name}</h2>
        <button
          className={btn.ghost}
          onClick={() => confirm(`Delete workstream "${ws.name}" from this template?`) && deleteTemplateWorkstream(templateId, ws.id)}
        >
          Delete workstream
        </button>
      </div>
      <table className="w-full min-w-[800px] text-sm">
        <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="w-48 px-3 py-2 font-medium">Section</th>
            <th className="px-3 py-2 font-medium">Task</th>
            <th className="w-20 px-3 py-2 font-medium">Priority</th>
            <th className="w-28 px-3 py-2 font-medium">Phase</th>
            <th className="w-16" />
          </tr>
        </thead>
        <tbody className="divide-y divide-line/70">
          {ws.tasks.map((t) => <TemplateTaskRow key={t.id} task={t} save={save} onDelete={() => deleteTemplateTask(templateId, t.id)} />)}
          <tr className="bg-canvas/60">
            <td className="px-2 py-2 align-top">
              <input list="sections" className={input} placeholder="Section" value={draft.section} onChange={(e) => setDraft({ ...draft, section: e.target.value })} />
              <datalist id="sections">{sections.map((s) => <option key={s} value={s} />)}</datalist>
            </td>
            <td className="px-2 py-2 align-top">
              <textarea rows={1} className={input} placeholder="New task" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </td>
            <td className="px-2 py-2 align-top">
              <select className={input} value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) })}>
                {[1, 2, 3].map((p) => <option key={p}>{p}</option>)}
              </select>
            </td>
            <td className="px-2 py-2 align-top">
              <select className={input} value={draft.phase} onChange={(e) => setDraft({ ...draft, phase: e.target.value })}>
                {PHASES.map((p) => <option key={p} value={p}>{PHASE_LABEL[p]}</option>)}
              </select>
            </td>
            <td className="px-2 py-2 align-top">
              <button
                className={btn.primary}
                disabled={!draft.title.trim()}
                onClick={async () => (await save(draft)) && setDraft({ ...draft, title: "" })}
              >
                Add
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </Card>
  );
}

function TemplateTaskRow({ task, save, onDelete }: { task: TT; save: (t: TT) => Promise<boolean>; onDelete: () => void }) {
  const [t, setT] = useState(task);
  useEffect(() => setT(task), [task]);
  const cell = "w-full rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-line focus:border-accent focus:bg-white focus:outline-none";
  const commit = (next: TT) => {
    setT(next);
    if (JSON.stringify(next) !== JSON.stringify(task)) save(next);
  };
  return (
    <tr className="group align-top">
      <td className="px-2 py-1"><input className={cell + " text-muted"} value={t.section} onChange={(e) => setT({ ...t, section: e.target.value })} onBlur={() => commit(t)} /></td>
      <td className="px-2 py-1"><textarea rows={1} className={cell + " text-ink field-sizing-content"} value={t.title} onChange={(e) => setT({ ...t, title: e.target.value })} onBlur={() => commit(t)} /></td>
      <td className="px-2 py-1">
        <select className={cell} value={t.priority} onChange={(e) => commit({ ...t, priority: Number(e.target.value) })}>
          {[1, 2, 3].map((p) => <option key={p}>{p}</option>)}
        </select>
      </td>
      <td className="px-2 py-1">
        <select className={cell} value={t.phase} onChange={(e) => commit({ ...t, phase: e.target.value })}>
          {PHASES.map((p) => <option key={p} value={p}>{PHASE_LABEL[p]}</option>)}
        </select>
      </td>
      <td className="px-2 py-1 text-right">
        <button className="text-xs text-muted opacity-0 hover:text-rag-red group-hover:opacity-100" onClick={() => confirm("Delete this template task?") && onDelete()}>
          Delete
        </button>
      </td>
    </tr>
  );
}
