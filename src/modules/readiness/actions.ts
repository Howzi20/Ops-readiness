"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { parseDateInput } from "@/lib/dates";
import { DOCUMENTED, FLAGS, ORGANISATIONS, PHASES, RISK_LEVELS, RISK_STATUSES, STATUSES } from "./constants";
import { applySignOff, normaliseTaskUpdate } from "./rules";
import { approveTask, notifyApprover, returnTask } from "./approval";
import { createSiteFromTemplate, duplicateTemplate, renumberTemplateWorkstreams, renumberWorkstreams, saveSiteAsTemplate } from "./templates";

export type ActionResult = { ok: true } | { ok: false; error: string };

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const sitePath = (siteId: string) => `/readiness/sites/${siteId}`;

function fail(e: unknown): ActionResult {
  if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Invalid input" };
  if (e instanceof Error) return { ok: false, error: e.message };
  return { ok: false, error: "Something went wrong" };
}

// ---------------- Sites ----------------

export async function createSite(_prev: ActionResult | undefined, form: FormData): Promise<ActionResult> {
  await requireUser();
  const name = str(form, "name");
  if (!name) return { ok: false, error: "Site name is required" };
  const templateId = str(form, "templateId") || null;
  const site = await createSiteFromTemplate(db, {
    name,
    client: str(form, "client"),
    address: str(form, "address"),
    templateId,
    transitionStart: parseDateInput(form.get("transitionStart")),
    pcDate: parseDateInput(form.get("pcDate")),
    goLiveDate: parseDateInput(form.get("goLiveDate")),
  });
  revalidatePath("/readiness");
  redirect(sitePath(site.id));
}

export async function updateSite(siteId: string, _prev: ActionResult | undefined, form: FormData): Promise<ActionResult> {
  await requireUser();
  const name = str(form, "name");
  if (!name) return { ok: false, error: "Site name is required" };
  await db.site.update({
    where: { id: siteId },
    data: {
      name,
      client: str(form, "client"),
      address: str(form, "address"),
      transitionStart: parseDateInput(form.get("transitionStart")),
      pcDate: parseDateInput(form.get("pcDate")),
      goLiveDate: parseDateInput(form.get("goLiveDate")),
    },
  });
  revalidatePath(sitePath(siteId), "layout");
  return { ok: true };
}

export async function deleteSite(siteId: string) {
  await requireUser();
  await db.site.delete({ where: { id: siteId } });
  revalidatePath("/readiness");
  redirect("/readiness");
}

export async function saveAsTemplate(siteId: string, _prev: ActionResult | undefined, form: FormData): Promise<ActionResult> {
  await requireUser();
  const name = str(form, "name");
  if (!name) return { ok: false, error: "Template name is required" };
  if (await db.template.findUnique({ where: { name } })) return { ok: false, error: "A template with that name already exists" };
  const t = await saveSiteAsTemplate(db, siteId, name, str(form, "description"));
  redirect(`/readiness/templates/${t.id}`);
}

// ---------------- Tasks ----------------

const taskPatch = z
  .object({
    title: z.string().trim().min(1, "Task title is required"),
    section: z.string().trim(),
    priority: z.coerce.number().int().min(1).max(3),
    startDate: z.string().nullable(),
    targetDate: z.string().nullable(),
    status: z.enum(STATUSES),
    progress: z.coerce.number().min(0).max(100),
    phase: z.enum(PHASES),
    documented: z.enum(DOCUMENTED),
    notes: z.string(),
    flagOverride: z.enum(FLAGS).nullable(),
    overrideNote: z.string(),
    ownerId: z.string().nullable(),
    signOffId: z.string().nullable(),
    collaboratorIds: z.array(z.string()),
  })
  .partial();

export type TaskPatch = z.input<typeof taskPatch>;

export async function updateTask(taskId: string, patch: TaskPatch): Promise<ActionResult & { progress?: number; status?: string }> {
  try {
    const user = await requireUser();
    const parsed = taskPatch.parse(patch);
    const current = await db.task.findUniqueOrThrow({ where: { id: taskId }, include: { workstream: true } });
    // the override note rule needs both fields; fall back to the stored note
    if (parsed.flagOverride !== undefined && parsed.overrideNote === undefined) parsed.overrideNote = current.overrideNote;
    const p = applySignOff(normaliseTaskUpdate(parsed), current);
    const { targetDate, startDate, collaboratorIds, ...rest } = p;
    const start = startDate !== undefined ? parseDateInput(startDate) : current.startDate;
    const target = targetDate !== undefined ? parseDateInput(targetDate) : current.targetDate;
    if (start && target && start > target) throw new Error("Start date must be on or before the target date");
    // contact ids must belong to this site
    for (const id of [rest.ownerId, rest.signOffId, ...(collaboratorIds ?? [])]) {
      if (id && !(await db.contact.findFirst({ where: { id, siteId: current.workstream.siteId } }))) {
        throw new Error("Unknown contact");
      }
    }
    const saved = await db.task.update({
      where: { id: taskId },
      data: {
        ...rest,
        ...(targetDate !== undefined ? { targetDate: target } : {}),
        ...(startDate !== undefined ? { startDate: start } : {}),
        ...(collaboratorIds !== undefined ? { collaborators: { set: collaboratorIds.map((id) => ({ id })) } } : {}),
        updatedById: user.id,
      },
    });
    // just finished and needs approval → email the approver (never blocks the save)
    if (saved.status === "AWAITING_SIGNOFF" && current.status !== "AWAITING_SIGNOFF") {
      await notifyApprover(taskId).catch((e) => console.error("Approval email failed", e));
    }
    revalidatePath(sitePath(current.workstream.siteId), "layout");
    return { ok: true, progress: saved.progress, status: saved.status };
  } catch (e) {
    return fail(e);
  }
}

/** Approver approves from inside the app: Awaiting approval → Completed. */
export async function approveSignOff(taskId: string, approverName: string): Promise<ActionResult & { signedOffAt?: string }> {
  try {
    const user = await requireUser();
    const r = await approveTask(taskId, approverName.trim() || user.name, user.id);
    revalidatePath(sitePath(r.siteId), "layout");
    return { ok: true, signedOffAt: r.signedOffAt.toISOString() };
  } catch (e) {
    return fail(e);
  }
}

/** Approver sends the task back to the owner with a reason. */
export async function returnSignOff(taskId: string, approverName: string, reason: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const r = await returnTask(taskId, approverName.trim() || user.name, reason, user.id);
    revalidatePath(sitePath(r.siteId), "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function addTaskUpdate(taskId: string, body: string, authorName: string): Promise<ActionResult & { update?: { id: string; authorName: string; body: string; createdAt: string } }> {
  try {
    const user = await requireUser();
    if (!body.trim()) throw new Error("Write something first");
    const u = await db.taskUpdate.create({
      data: { taskId, body: body.trim(), authorName: authorName.trim() || user.name },
      include: { task: { include: { workstream: true } } },
    });
    revalidatePath(sitePath(u.task.workstream.siteId), "layout");
    return { ok: true, update: { id: u.id, authorName: u.authorName, body: u.body, createdAt: u.createdAt.toISOString() } };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteTaskUpdate(updateId: string): Promise<ActionResult> {
  try {
    await requireUser();
    const u = await db.taskUpdate.delete({ where: { id: updateId }, include: { task: { include: { workstream: true } } } });
    revalidatePath(sitePath(u.task.workstream.siteId), "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function addTask(workstreamId: string, section: string, title: string): Promise<ActionResult> {
  try {
    await requireUser();
    if (!title.trim()) throw new Error("Task title is required");
    const ws = await db.workstream.findUniqueOrThrow({ where: { id: workstreamId } });
    const max = await db.task.aggregate({ where: { workstreamId }, _max: { sortOrder: true } });
    // place the new task after the last task in its section
    const lastInSection = await db.task.findFirst({ where: { workstreamId, section }, orderBy: { sortOrder: "desc" } });
    const sortOrder = lastInSection ? lastInSection.sortOrder + 1 : (max._max.sortOrder ?? -1) + 1;
    await db.task.updateMany({ where: { workstreamId, sortOrder: { gte: sortOrder } }, data: { sortOrder: { increment: 1 } } });
    await db.task.create({ data: { workstreamId, section: section.trim(), title: title.trim(), sortOrder } });
    revalidatePath(sitePath(ws.siteId), "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteTask(taskId: string): Promise<ActionResult> {
  try {
    await requireUser();
    const t = await db.task.delete({ where: { id: taskId }, include: { workstream: true } });
    revalidatePath(sitePath(t.workstream.siteId), "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---------------- Workstreams ----------------

export async function addWorkstream(siteId: string, _prev: ActionResult | undefined, form: FormData): Promise<ActionResult> {
  await requireUser();
  const name = str(form, "name");
  if (!name) return { ok: false, error: "Workstream name is required" };
  const max = await db.workstream.aggregate({ where: { siteId }, _max: { sortOrder: true } });
  await db.workstream.create({
    data: { siteId, name, code: "", sortOrder: (max._max.sortOrder ?? -1) + 1 },
  });
  await renumberWorkstreams(db, siteId);
  revalidatePath(sitePath(siteId), "layout");
  return { ok: true };
}

export async function setWorkstreamPerson(
  workstreamId: string,
  role: "ownerId" | "approverId",
  contactId: string | null,
): Promise<ActionResult> {
  try {
    await requireUser();
    if (role !== "ownerId" && role !== "approverId") throw new Error("Unknown role");
    const current = await db.workstream.findUniqueOrThrow({ where: { id: workstreamId } });
    if (contactId && !(await db.contact.findFirst({ where: { id: contactId, siteId: current.siteId } }))) {
      throw new Error("Unknown contact");
    }
    const ws = await db.workstream.update({ where: { id: workstreamId }, data: { [role]: contactId || null } });
    revalidatePath(sitePath(ws.siteId), "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteWorkstream(workstreamId: string) {
  await requireUser();
  const ws = await db.workstream.delete({ where: { id: workstreamId } });
  await renumberWorkstreams(db, ws.siteId);
  revalidatePath(sitePath(ws.siteId), "layout");
  redirect(`${sitePath(ws.siteId)}/workstreams`);
}

// ---------------- Contacts ----------------

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  organisation: z.enum(ORGANISATIONS),
  role: z.string().trim(),
  initials: z.string().trim().min(1, "Initials are required").max(6),
  phone: z.string().trim(),
  email: z.string().trim(),
  leaveNotes: z.string().trim(),
});

function contactFrom(form: FormData) {
  return contactSchema.parse({
    name: str(form, "name"),
    organisation: str(form, "organisation") || "TEAM",
    role: str(form, "role"),
    initials: str(form, "initials").toUpperCase(),
    phone: str(form, "phone"),
    email: str(form, "email"),
    leaveNotes: str(form, "leaveNotes"),
  });
}

export async function saveContact(siteId: string, contactId: string | null, _prev: ActionResult | undefined, form: FormData): Promise<ActionResult> {
  try {
    await requireUser();
    const data = contactFrom(form);
    if (contactId) await db.contact.update({ where: { id: contactId, siteId }, data });
    else await db.contact.create({ data: { ...data, siteId } });
    revalidatePath(sitePath(siteId), "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteContact(siteId: string, contactId: string): Promise<ActionResult> {
  await requireUser();
  await db.contact.delete({ where: { id: contactId, siteId } });
  revalidatePath(sitePath(siteId), "layout");
  return { ok: true };
}

// ---------------- Key dates ----------------

export async function addKeyDate(siteId: string, _prev: ActionResult | undefined, form: FormData): Promise<ActionResult> {
  await requireUser();
  const name = str(form, "name");
  const date = parseDateInput(form.get("date"));
  if (!name || !date) return { ok: false, error: "Name and date are required" };
  await db.keyDate.create({ data: { siteId, name, date } });
  revalidatePath(sitePath(siteId), "layout");
  return { ok: true };
}

export async function deleteKeyDate(siteId: string, id: string) {
  await requireUser();
  await db.keyDate.delete({ where: { id, siteId } });
  revalidatePath(sitePath(siteId), "layout");
}

// ---------------- Risks ----------------

const riskSchema = z.object({
  function: z.string().trim(),
  description: z.string().trim().min(1, "Description is required"),
  identifiedBy: z.string().trim(),
  severity: z.enum(RISK_LEVELS),
  likelihood: z.enum(RISK_LEVELS),
  responsible: z.string().trim(),
  action: z.string().trim(),
  status: z.enum(RISK_STATUSES),
});

export async function saveRisk(siteId: string, riskId: string | null, _prev: ActionResult | undefined, form: FormData): Promise<ActionResult> {
  try {
    await requireUser();
    const data = {
      ...riskSchema.parse({
        function: str(form, "function"),
        description: str(form, "description"),
        identifiedBy: str(form, "identifiedBy"),
        severity: str(form, "severity") || "MEDIUM",
        likelihood: str(form, "likelihood") || "MEDIUM",
        responsible: str(form, "responsible"),
        action: str(form, "action"),
        status: str(form, "status") || "OPEN",
      }),
      targetDate: parseDateInput(form.get("targetDate")),
    };
    if (riskId) {
      await db.risk.update({ where: { id: riskId, siteId }, data });
    } else {
      const max = await db.risk.aggregate({ where: { siteId }, _max: { number: true } });
      await db.risk.create({ data: { ...data, siteId, number: (max._max.number ?? 0) + 1 } });
    }
    revalidatePath(sitePath(siteId), "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteRisk(siteId: string, id: string) {
  await requireUser();
  await db.risk.delete({ where: { id, siteId } });
  revalidatePath(sitePath(siteId), "layout");
}

// ---------------- Templates ----------------

export async function createTemplate(_prev: ActionResult | undefined, form: FormData): Promise<ActionResult> {
  await requireUser();
  const name = str(form, "name");
  if (!name) return { ok: false, error: "Template name is required" };
  if (await db.template.findUnique({ where: { name } })) return { ok: false, error: "A template with that name already exists" };
  const t = await db.template.create({ data: { name, description: str(form, "description") } });
  redirect(`/readiness/templates/${t.id}`);
}

export async function updateTemplate(id: string, _prev: ActionResult | undefined, form: FormData): Promise<ActionResult> {
  try {
    await requireUser();
    const name = str(form, "name");
    if (!name) return { ok: false, error: "Template name is required" };
    await db.template.update({ where: { id }, data: { name, description: str(form, "description") } });
    revalidatePath("/readiness/templates", "layout");
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not save — is that name already used?" };
  }
}

export async function duplicateTemplateAction(id: string) {
  await requireUser();
  const src = await db.template.findUniqueOrThrow({ where: { id } });
  let name = `${src.name} (copy)`;
  for (let i = 2; await db.template.findUnique({ where: { name } }); i++) name = `${src.name} (copy ${i})`;
  const t = await duplicateTemplate(db, id, name);
  redirect(`/readiness/templates/${t.id}`);
}

export async function deleteTemplate(id: string) {
  await requireUser();
  await db.template.delete({ where: { id } });
  revalidatePath("/readiness/templates");
  redirect("/readiness/templates");
}

export async function addTemplateWorkstream(templateId: string, _prev: ActionResult | undefined, form: FormData): Promise<ActionResult> {
  await requireUser();
  const name = str(form, "name");
  if (!name) return { ok: false, error: "Workstream name is required" };
  const max = await db.templateWorkstream.aggregate({ where: { templateId }, _max: { sortOrder: true } });
  await db.templateWorkstream.create({ data: { templateId, name, code: "", sortOrder: (max._max.sortOrder ?? -1) + 1 } });
  await renumberTemplateWorkstreams(db, templateId);
  revalidatePath(`/readiness/templates/${templateId}`);
  return { ok: true };
}

export async function deleteTemplateWorkstream(templateId: string, id: string) {
  await requireUser();
  await db.templateWorkstream.delete({ where: { id } });
  await renumberTemplateWorkstreams(db, templateId);
  revalidatePath(`/readiness/templates/${templateId}`);
}

const templateTaskSchema = z.object({
  title: z.string().trim().min(1, "Task title is required"),
  section: z.string().trim(),
  priority: z.coerce.number().int().min(1).max(3),
  phase: z.enum(PHASES),
});

export async function saveTemplateTask(
  templateId: string,
  workstreamId: string,
  taskId: string | null,
  data: z.input<typeof templateTaskSchema>,
): Promise<ActionResult> {
  try {
    await requireUser();
    const d = templateTaskSchema.parse(data);
    if (taskId) {
      await db.templateTask.update({ where: { id: taskId }, data: d });
    } else {
      const max = await db.templateTask.aggregate({ where: { workstreamId }, _max: { sortOrder: true } });
      await db.templateTask.create({ data: { ...d, workstreamId, sortOrder: (max._max.sortOrder ?? -1) + 1 } });
    }
    revalidatePath(`/readiness/templates/${templateId}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteTemplateTask(templateId: string, taskId: string): Promise<ActionResult> {
  await requireUser();
  await db.templateTask.delete({ where: { id: taskId } });
  revalidatePath(`/readiness/templates/${templateId}`);
  return { ok: true };
}
