import { db } from "@/lib/db";
import { fmtDate } from "@/lib/dates";
import { verifyApprovalToken } from "@/modules/readiness/approvalToken";
import { STATUS_COLOR, STATUS_LABEL, type Status } from "@/modules/readiness/constants";
import { ApprovalForm } from "./ApprovalForm";

export const metadata = { title: "Review & approve" };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-canvas px-4 py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-4 text-sm font-semibold text-ink">Operations Readiness</div>
        <div className="rounded-lg border border-line bg-white p-6 shadow-xs">{children}</div>
      </div>
    </main>
  );
}

export default async function ApprovePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const claim = await verifyApprovalToken(token);
  if (!claim) {
    return (
      <Shell>
        <h1 className="text-lg font-semibold text-ink">Link invalid or expired</h1>
        <p className="mt-2 text-sm text-muted">Approval links last 30 days. Ask the task owner to mark it complete again, or approve it inside the app.</p>
      </Shell>
    );
  }
  const t = await db.task.findUnique({
    where: { id: claim.taskId },
    include: { workstream: { include: { site: true } }, owner: true, signOff: true, updates: { orderBy: { createdAt: "desc" }, take: 5 } },
  });
  if (!t || t.signOffId !== claim.approverId) {
    return (
      <Shell>
        <h1 className="text-lg font-semibold text-ink">This link no longer applies</h1>
        <p className="mt-2 text-sm text-muted">The task was deleted or its approver has changed.</p>
      </Shell>
    );
  }
  const c = STATUS_COLOR[t.status as Status];
  const rows: [string, string][] = [
    ["Site", t.workstream.site.name],
    ["Workstream", `${t.workstream.code}. ${t.workstream.name}`],
    ["Owner", t.owner?.name ?? "—"],
    ["Target date", fmtDate(t.targetDate)],
  ];
  return (
    <Shell>
      <div className="text-xs uppercase tracking-wide text-muted">Approval for {t.signOff?.name}</div>
      <h1 className="mt-1 text-lg font-semibold text-ink">{t.title}</h1>
      <span className="mt-2 inline-block rounded px-2 py-0.5 text-xs font-medium" style={{ background: c.bg, color: c.fg }}>
        {STATUS_LABEL[t.status as Status]}
      </span>
      <dl className="mt-4 grid grid-cols-[8rem_1fr] gap-y-1.5 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted">{k}</dt>
            <dd className="text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      {t.notes && <p className="mt-3 whitespace-pre-line rounded bg-canvas p-3 text-sm text-ink-soft">{t.notes}</p>}
      {t.updates.length > 0 && (
        <div className="mt-4">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Recent updates</div>
          <ul className="space-y-2">
            {t.updates.map((u) => (
              <li key={u.id} className="rounded border border-line p-2 text-sm">
                <span className="font-medium text-ink">{u.authorName}</span>{" "}
                <span className="text-xs text-muted">{u.createdAt.toLocaleDateString("en-AU", { day: "2-digit", month: "short" })}</span>
                <p className="whitespace-pre-line text-ink-soft">{u.body}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-6 border-t border-line pt-4">
        {t.status === "AWAITING_SIGNOFF" ? (
          <ApprovalForm token={token} />
        ) : t.status === "COMPLETED" && t.signedOffAt ? (
          <p className="text-sm text-ink">
            ✅ Approved by <strong>{t.signedOffBy}</strong> on {fmtDate(t.signedOffAt)}. Nothing more to do.
          </p>
        ) : (
          <p className="text-sm text-muted">This task isn&apos;t waiting for approval any more (it&apos;s {STATUS_LABEL[t.status as Status]}).</p>
        )}
      </div>
    </Shell>
  );
}
