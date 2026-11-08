import { db } from "@/lib/db";
import { mailConfigured } from "@/lib/mailer";
import { Card, Empty, PageHeader, cx } from "@/components/ui";

export const metadata = { title: "Outbox" };

const STATUS: Record<string, { label: string; cls: string }> = {
  SENT: { label: "Sent", cls: "bg-rag-green-soft text-rag-green" },
  NOT_CONFIGURED: { label: "Not sent — email not set up", cls: "bg-canvas text-muted" },
  NO_ADDRESS: { label: "Not sent — no email address", cls: "bg-rag-yellow-soft text-[#94690a]" },
  FAILED: { label: "Failed", cls: "bg-rag-red-soft text-rag-red" },
};

export default async function OutboxPage() {
  const emails = await db.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  const configured = mailConfigured();
  return (
    <>
      <PageHeader title="Outbox" subtitle="Emails the app has sent: approval requests to approvers, and approved / returned notices to owners." />
      {!configured && (
        <div className="mb-5 rounded-lg border border-line bg-white p-4 text-sm text-ink-soft">
          <strong className="text-ink">Email sending isn&apos;t set up yet</strong>, so emails are kept here instead of being sent.
          You can still open each email&apos;s link to try the approval flow. To send real emails, add your SMTP settings to <code>.env</code> (see the README).
        </div>
      )}
      {emails.length === 0 ? (
        <Empty>No emails yet. One is created when a task with an approver reaches Awaiting approval.</Empty>
      ) : (
        <div className="space-y-3">
          {emails.map((e) => {
            const s = STATUS[e.status] ?? STATUS.FAILED;
            const link = /(https?:\/\/\S+)/.exec(e.text.split("\n").at(-1) ?? "")?.[1];
            return (
              <Card key={e.id} className="p-4">
                <details>
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink">{e.subject}</span>
                      <span className="text-xs text-muted">
                        To {e.to || "—"} · {e.createdAt.toLocaleString("en-AU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </span>
                    <span className={cx("rounded px-2 py-0.5 text-xs font-medium", s.cls)}>{s.label}</span>
                    {link && (
                      <a href={link} className="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent-soft">
                        Open link
                      </a>
                    )}
                  </summary>
                  {e.error && e.status !== "NOT_CONFIGURED" && <p className="mt-2 text-xs text-rag-red">{e.error}</p>}
                  <iframe title={e.subject} srcDoc={e.html} sandbox="" className="mt-3 h-[480px] w-full rounded border border-line bg-white" />
                </details>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
