import Link from "next/link";
import { getContacts, getSiteDashboard } from "@/modules/readiness/queries";
import { Card, Empty, ProgressBar, pct } from "@/components/ui";
import { AddWorkstreamForm, PersonSelect } from "./WorkstreamControls";

export const metadata = { title: "Workstreams" };

export default async function WorkstreamsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const [d, contacts] = await Promise.all([getSiteDashboard(siteId), getContacts(siteId)]);
  const base = `/readiness/sites/${siteId}/workstreams`;
  const options = contacts.map((c) => ({ id: c.id, label: `${c.initials} — ${c.name}` }));
  return (
    <div className="space-y-4">
      {d.streams.length === 0 ? (
        <Empty>No workstreams yet.</Empty>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">#</th>
                <th className="px-4 py-2.5 font-medium">Workstream</th>
                <th className="px-4 py-2.5 font-medium">Owner</th>
                <th className="px-4 py-2.5 font-medium">Approver</th>
                <th className="w-48 px-4 py-2.5 font-medium">Completion</th>
                <th className="px-4 py-2.5 text-center font-medium">Red</th>
                <th className="px-4 py-2.5 text-center font-medium">Yellow</th>
                <th className="px-4 py-2.5 text-right font-medium">Tasks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {d.streams.map((w) => (
                <tr key={w.id} className="hover:bg-canvas/60">
                  <td className="px-4 py-2.5 text-muted tabular">{w.code}</td>
                  <td className="px-4 py-2.5">
                    <Link href={`${base}/${w.id}`} className="font-medium text-ink hover:text-accent">{w.name}</Link>
                    {w.atRisk && <span className="ml-2 rounded bg-rag-red-soft px-1.5 py-0.5 text-xs font-medium text-rag-red">At risk</span>}
                  </td>
                  <td className="px-4 py-2">
                    <PersonSelect workstreamId={w.id} role="ownerId" value={w.owner?.id ?? ""} options={options} />
                  </td>
                  <td className="px-4 py-2">
                    <PersonSelect workstreamId={w.id} role="approverId" value={w.approver?.id ?? ""} options={options} />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <ProgressBar value={w.completion} />
                      <span className="w-10 text-right tabular text-ink">{pct(w.completion)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-center tabular">{w.red || <span className="text-muted">0</span>}</td>
                  <td className="px-4 py-2.5 text-center tabular">{w.yellow || <span className="text-muted">0</span>}</td>
                  <td className="px-4 py-2.5 text-right tabular text-muted">{w.done}/{w.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <AddWorkstreamForm siteId={siteId} />
    </div>
  );
}
