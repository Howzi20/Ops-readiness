"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verifyApprovalToken } from "@/modules/readiness/approvalToken";
import { approveTask, returnTask } from "@/modules/readiness/approval";

export type LinkResult = { ok: boolean; message: string } | undefined;

/** Checks the link is genuine, unexpired, and its approver is still the task's approver. */
async function resolve(token: string) {
  const claim = await verifyApprovalToken(token);
  if (!claim) throw new Error("This approval link is invalid or has expired.");
  const task = await db.task.findUnique({ where: { id: claim.taskId }, include: { signOff: true } });
  if (!task) throw new Error("This task no longer exists.");
  if (task.signOffId !== claim.approverId || !task.signOff) throw new Error("You are no longer the approver for this task.");
  return { task, approver: task.signOff };
}

export async function approveViaLink(token: string, _prev: LinkResult, _form: FormData): Promise<LinkResult> {
  try {
    const { task, approver } = await resolve(token);
    const r = await approveTask(task.id, approver.name, null);
    revalidatePath(`/readiness/sites/${r.siteId}`, "layout");
    revalidatePath(`/approve/${token}`);
    return { ok: true, message: "Approved. The task is now Completed and the owner has been notified." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Something went wrong" };
  }
}

export async function returnViaLink(token: string, _prev: LinkResult, form: FormData): Promise<LinkResult> {
  try {
    const { task, approver } = await resolve(token);
    const r = await returnTask(task.id, approver.name, String(form.get("reason") ?? ""), null);
    revalidatePath(`/readiness/sites/${r.siteId}`, "layout");
    revalidatePath(`/approve/${token}`);
    return { ok: true, message: "Returned to the owner with your note. The task is back In Progress." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Something went wrong" };
  }
}
