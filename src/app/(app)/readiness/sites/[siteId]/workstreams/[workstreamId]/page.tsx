import { getContacts, getSite, getWorkstream } from "@/modules/readiness/queries";
import { requireUser } from "@/lib/auth";
import { toDateInput } from "@/lib/dates";
import { ProgressBar, pct } from "@/components/ui";
import { Board } from "./board/Board";
import { DeleteWorkstreamButton } from "./DeleteWorkstreamButton";
import Link from "next/link";

export default async function WorkstreamPage({ params }: { params: Promise<{ siteId: string; workstreamId: string }> }) {
  const { siteId, workstreamId } = await params;
  const [{ ws, tasks, summary }, contacts, site, user] = await Promise.all([getWorkstream(siteId, workstreamId), getContacts(siteId), getSite(siteId), requireUser()]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href={`/readiness/sites/${siteId}/workstreams`} className="text-sm text-muted hover:text-accent">← All workstreams</Link>
          <h2 className="text-xl font-semibold text-ink">
            <span className="mr-2 text-muted tabular">{ws.code}</span>{ws.name}
          </h2>
          <div className="text-sm text-muted">
            Owner: <span className="text-ink-soft">{ws.owner?.name ?? "not set"}</span>
            <span className="mx-2">·</span>
            Approver: <span className="text-ink-soft">{ws.approver?.name ?? "not set"}</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="w-56">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Completion</span>
              <span className="font-semibold text-ink tabular">{pct(summary.completion)}</span>
            </div>
            <ProgressBar value={summary.completion} className="mt-1" />
            <div className="mt-1 text-xs text-muted tabular">
              {summary.done}/{summary.total} done · {summary.red} red · {summary.yellow} yellow
            </div>
          </div>
          <DeleteWorkstreamButton id={ws.id} name={ws.name} />
        </div>
      </div>
      <Board
        workstreamId={ws.id}
        initialTasks={tasks}
        contacts={contacts.map((c) => ({ id: c.id, initials: c.initials, name: c.name }))}
        keyDates={{ pc: toDateInput(site.pcDate), goLive: toDateInput(site.goLiveDate) }}
        userName={user.name}
      />
    </div>
  );
}
