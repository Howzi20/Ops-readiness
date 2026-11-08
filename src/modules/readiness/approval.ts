import "server-only";
import { db } from "@/lib/db";
import { appUrl, sendEmail } from "@/lib/mailer";
import { fmtDate } from "@/lib/dates";
import { signApprovalToken } from "./approvalToken";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

async function loadTask(taskId: string) {
  return db.task.findUniqueOrThrow({
    where: { id: taskId },
    include: {
      workstream: { include: { site: true } },
      owner: true,
      signOff: true,
      updates: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}
type LoadedTask = Awaited<ReturnType<typeof loadTask>>;

function layout(title: string, intro: string, t: LoadedTask, button?: { href: string; label: string }) {
  const rows: [string, string][] = [
    ["Site", t.workstream.site.name],
    ["Workstream", `${t.workstream.code}. ${t.workstream.name}`],
    ["Task", t.title],
    ["Owner", t.owner?.name ?? "—"],
    ["Target date", fmtDate(t.targetDate)],
  ];
  if (t.updates[0]) rows.push(["Latest update", `${t.updates[0].authorName}: ${t.updates[0].body}`]);
  const html = `<!doctype html><html><body style="margin:0;background:#f4f6f9;font-family:-apple-system,Segoe UI,Arial,sans-serif;color:#1f2a37">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#ffffff;border:1px solid #e2e7ee;border-radius:8px">
<tr><td style="padding:20px 24px;border-bottom:1px solid #e2e7ee;font-weight:600;font-size:16px">Operations Readiness</td></tr>
<tr><td style="padding:20px 24px">
<h1 style="margin:0 0 8px;font-size:18px">${esc(title)}</h1>
<p style="margin:0 0 16px;font-size:14px;line-height:1.5">${esc(intro)}</p>
<table cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;border-collapse:collapse">
${rows.map(([k, v]) => `<tr><td width="110" style="width:110px;padding:6px 12px 6px 0;color:#6b7a8c;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:6px 0;white-space:pre-line">${esc(v)}</td></tr>`).join("")}
</table>
${button ? `<p style="margin:24px 0 8px"><a href="${esc(button.href)}" style="display:inline-block;background:#0e7c86;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600;font-size:14px">${esc(button.label)}</a></p>
<p style="margin:0;font-size:12px;color:#6b7a8c;word-break:break-all">Or open this link: ${esc(button.href)}</p>` : ""}
</td></tr></table></td></tr></table></body></html>`;
  const text = [title, "", intro, "", ...rows.map(([k, v]) => `${k}: ${v}`), ...(button ? ["", `${button.label}: ${button.href}`] : [])].join("\n");
  return { html, text };
}

/** Email the approver that a task is waiting for them. */
export async function notifyApprover(taskId: string) {
  const t = await loadTask(taskId);
  if (t.status !== "AWAITING_SIGNOFF" || !t.signOff) return;
  const token = await signApprovalToken({ taskId: t.id, approverId: t.signOff.id });
  const { html, text } = layout(
    `Approval needed: ${t.title}`,
    `Hi ${t.signOff.name}, ${t.owner?.name ?? "the owner"} has marked this task as complete. Please review it and approve it, or return it with a note.`,
    t,
    { href: `${appUrl()}/approve/${token}`, label: "Review & approve" },
  );
  await sendEmail({ to: t.signOff.email, subject: `Approval needed: ${t.title}`, html, text, taskId: t.id });
}

async function notifyOwner(taskId: string, outcome: "approved" | "returned", by: string, reason?: string) {
  const t = await loadTask(taskId);
  if (!t.owner) return;
  const subject = outcome === "approved" ? `Approved: ${t.title}` : `Returned for more work: ${t.title}`;
  const intro =
    outcome === "approved"
      ? `Hi ${t.owner.name}, ${by} has approved this task. It is now Completed.`
      : `Hi ${t.owner.name}, ${by} has returned this task for more work: "${reason}". It is back In Progress.`;
  const { html, text } = layout(subject, intro, t, {
    href: `${appUrl()}/readiness/sites/${t.workstream.siteId}/workstreams/${t.workstreamId}?task=${t.id}`,
    label: "Open the task",
  });
  await sendEmail({ to: t.owner.email, subject, html, text, taskId: t.id });
}

/** Awaiting approval → Completed. Records who approved, posts an update and emails the owner. */
export async function approveTask(taskId: string, approverName: string, userId: string | null) {
  const t = await db.task.findUniqueOrThrow({ where: { id: taskId }, include: { workstream: true } });
  if (t.status !== "AWAITING_SIGNOFF") throw new Error("This task isn't waiting for approval");
  const now = new Date();
  await db.$transaction([
    db.task.update({ where: { id: taskId }, data: { status: "COMPLETED", progress: 100, signedOffAt: now, signedOffBy: approverName, updatedById: userId } }),
    db.taskUpdate.create({ data: { taskId, authorName: approverName, body: "✅ Approved — task completed." } }),
  ]);
  await notifyOwner(taskId, "approved", approverName);
  return { siteId: t.workstream.siteId, signedOffAt: now };
}

/** Awaiting approval → In Progress, with the reason posted as an update and emailed to the owner. */
export async function returnTask(taskId: string, approverName: string, reason: string, userId: string | null) {
  if (!reason.trim()) throw new Error("Give a reason so the owner knows what's needed");
  const t = await db.task.findUniqueOrThrow({ where: { id: taskId }, include: { workstream: true } });
  if (t.status !== "AWAITING_SIGNOFF") throw new Error("This task isn't waiting for approval");
  await db.$transaction([
    db.task.update({ where: { id: taskId }, data: { status: "IN_PROGRESS", progress: 90, updatedById: userId } }),
    db.taskUpdate.create({ data: { taskId, authorName: approverName, body: `↩️ Returned for more work: ${reason.trim()}` } }),
  ]);
  await notifyOwner(taskId, "returned", approverName, reason.trim());
  return { siteId: t.workstream.siteId };
}
