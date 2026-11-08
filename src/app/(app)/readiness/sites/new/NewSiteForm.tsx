"use client";
import { useActionState, useState } from "react";
import { createSite } from "@/modules/readiness/actions";
import { btn, Card, cx, input, label } from "@/components/ui";

type T = { id: string; name: string; description: string; workstreams: number; tasks: number };

export function NewSiteForm({ templates }: { templates: T[] }) {
  const [state, action, pending] = useActionState(createSite, undefined);
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  return (
    <form action={action} className="grid max-w-4xl gap-6 lg:grid-cols-[1fr_1fr]">
      <Card className="space-y-4 p-5">
        <h2 className="font-semibold text-ink">Site details</h2>
        <div>
          <label className={label} htmlFor="name">Site name *</label>
          <input id="name" name="name" required className={input} placeholder="e.g. Harbour Point Tower" />
        </div>
        <div>
          <label className={label} htmlFor="client">Client</label>
          <input id="client" name="client" className={input} />
        </div>
        <div>
          <label className={label} htmlFor="address">Address</label>
          <input id="address" name="address" className={input} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={label} htmlFor="transitionStart">Transition start</label>
            <input id="transitionStart" name="transitionStart" type="date" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="pcDate">Practical Completion</label>
            <input id="pcDate" name="pcDate" type="date" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="goLiveDate">Go-Live</label>
            <input id="goLiveDate" name="goLiveDate" type="date" className={input} />
          </div>
        </div>
      </Card>
      <Card className="space-y-3 p-5">
        <h2 className="font-semibold text-ink">Start from template</h2>
        <input type="hidden" name="templateId" value={templateId} />
        {[...templates, { id: "", name: "Blank site", description: "No workstreams or tasks — build it yourself.", workstreams: 0, tasks: 0 }].map((t) => (
          <button
            type="button"
            key={t.id || "blank"}
            onClick={() => setTemplateId(t.id)}
            className={cx(
              "block w-full rounded-md border p-3 text-left transition",
              templateId === t.id ? "border-accent bg-accent-soft" : "border-line hover:border-accent/40",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-ink">{t.name}</span>
              {t.id && <span className="text-xs text-muted tabular">{t.workstreams} workstreams · {t.tasks} tasks</span>}
            </div>
            {t.description && <div className="mt-1 text-sm text-muted">{t.description}</div>}
          </button>
        ))}
      </Card>
      <div className="flex items-center gap-3 lg:col-span-2">
        <button className={btn.primary} disabled={pending}>{pending ? "Creating…" : "Create site"}</button>
        {state && !state.ok && <span className="text-sm text-rag-red">{state.error}</span>}
      </div>
    </form>
  );
}
