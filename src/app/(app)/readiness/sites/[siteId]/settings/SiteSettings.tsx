"use client";
import { useActionState } from "react";
import { deleteSite, saveAsTemplate, updateSite } from "@/modules/readiness/actions";
import { btn, Card, input, label } from "@/components/ui";

type Site = { id: string; name: string; client: string; address: string; template: string | null; transitionStart: string; pcDate: string; goLiveDate: string };

export function SiteSettings({ site }: { site: Site }) {
  const [state, action, pending] = useActionState(updateSite.bind(null, site.id), undefined);
  const [tState, tAction, tPending] = useActionState(saveAsTemplate.bind(null, site.id), undefined);
  return (
    <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
      <Card className="p-5">
        <form action={action} className="space-y-4">
          <h2 className="font-semibold text-ink">Site details</h2>
          <div><label className={label}>Site name *</label><input name="name" required defaultValue={site.name} className={input} /></div>
          <div><label className={label}>Client</label><input name="client" defaultValue={site.client} className={input} /></div>
          <div><label className={label}>Address</label><input name="address" defaultValue={site.address} className={input} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={label}>Transition start</label><input type="date" name="transitionStart" defaultValue={site.transitionStart} className={input} /></div>
            <div><label className={label}>PC</label><input type="date" name="pcDate" defaultValue={site.pcDate} className={input} /></div>
            <div><label className={label}>Go-Live</label><input type="date" name="goLiveDate" defaultValue={site.goLiveDate} className={input} /></div>
          </div>
          <p className="text-xs text-muted">Created from template: {site.template ?? "none (blank)"}</p>
          <div className="flex items-center gap-3">
            <button className={btn.primary} disabled={pending}>{pending ? "Saving…" : "Save changes"}</button>
            {state?.ok && <span className="text-sm text-rag-green">Saved</span>}
            {state && !state.ok && <span className="text-sm text-rag-red">{state.error}</span>}
          </div>
        </form>
      </Card>
      <div className="space-y-6">
        <Card className="p-5">
          <form action={tAction} className="space-y-3">
            <h2 className="font-semibold text-ink">Save as template</h2>
            <p className="text-sm text-muted">
              Copies this site&apos;s workstreams, sections and task wording (with any lessons-learnt edits) into a new template.
              Dates, statuses, people and notes are not copied.
            </p>
            <input name="name" placeholder="Template name" className={input} />
            <input name="description" placeholder="Description (optional)" className={input} />
            <button className={btn.secondary} disabled={tPending}>Save as template</button>
            {tState && !tState.ok && <p className="text-sm text-rag-red">{tState.error}</p>}
          </form>
        </Card>
        <Card className="border-rag-red/30 p-5">
          <h2 className="font-semibold text-rag-red">Delete site</h2>
          <p className="mt-1 text-sm text-muted">Permanently deletes this site with all its tasks, contacts, risks and dates.</p>
          <button
            className={btn.danger + " mt-3"}
            onClick={async () => {
              if (prompt(`Type the site name to confirm deletion:\n${site.name}`) === site.name) await deleteSite(site.id);
            }}
          >
            Delete site
          </button>
        </Card>
      </div>
    </div>
  );
}
