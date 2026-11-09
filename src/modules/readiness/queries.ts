import "server-only";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { toDateInput } from "@/lib/dates";
import { completion, computeFlag, daysUntil, workstreamSummary } from "./rules";
import { ensureSiteNumbering } from "./templates";
import type { Flag } from "./constants";

const flagFields = { status: true, progress: true, targetDate: true, flagOverride: true } as const;

export async function getSitesOverview() {
  const today = new Date();
  for (const { id } of await db.site.findMany({ select: { id: true } })) await ensureSiteNumbering(db, id);
  const sites = await db.site.findMany({
    orderBy: { createdAt: "desc" },
    include: { template: { select: { name: true } }, workstreams: { include: { tasks: { select: flagFields } } } },
  });
  return sites.map((s) => {
    const tasks = s.workstreams.flatMap((w) => w.tasks);
    const sum = workstreamSummary(tasks, today);
    return {
      id: s.id,
      name: s.name,
      client: s.client,
      template: s.template?.name ?? null,
      daysToPc: daysUntil(s.pcDate, today),
      daysToGoLive: daysUntil(s.goLiveDate, today),
      ...sum,
    };
  });
}

export async function getSite(siteId: string) {
  const site = await db.site.findUnique({ where: { id: siteId }, include: { template: { select: { name: true } } } });
  if (!site) notFound();
  // repair data saved by older versions of the app (only writes when needed)
  await ensureSiteNumbering(db, siteId);
  await db.contact.updateMany({ where: { siteId, organisation: "JLL" }, data: { organisation: "TEAM" } });
  return site;
}

export async function getSiteDashboard(siteId: string) {
  const today = new Date();
  const site = await getSite(siteId);
  const workstreams = await db.workstream.findMany({
    where: { siteId },
    orderBy: { sortOrder: "asc" },
    include: {
      owner: { select: { id: true, name: true, initials: true } },
      approver: { select: { id: true, name: true, initials: true } },
      tasks: { select: { ...flagFields, phase: true } },
    },
  });
  const all = workstreams.flatMap((w) => w.tasks);
  const streams = workstreams.map((w) => ({
    id: w.id,
    code: w.code,
    name: w.name,
    owner: w.owner,
    approver: w.approver,
    ...workstreamSummary(w.tasks, today),
  }));
  const overall = workstreamSummary(all, today);
  const keyDates = await db.keyDate.findMany({ where: { siteId }, orderBy: { date: "asc" } });

  // widgets
  const statusCounts: Record<string, number> = {};
  for (const t of all) statusCounts[t.status] = (statusCounts[t.status] ?? 0) + 1;
  const people = await db.contact.findMany({
    where: { siteId },
    orderBy: { name: "asc" },
    include: { ownedTasks: { select: { status: true } } },
  });
  const workload = people
    .map((p) => {
      const by: Record<string, number> = {};
      for (const t of p.ownedTasks) by[t.status] = (by[t.status] ?? 0) + 1;
      return {
        id: p.id,
        name: p.name,
        initials: p.initials,
        by,
        open: (by.TO_COMMENCE ?? 0) + (by.IN_PROGRESS ?? 0) + (by.DELAYED ?? 0) + (by.AWAITING_SIGNOFF ?? 0),
      };
    })
    .filter((p) => p.open > 0)
    .sort((a, b) => b.open - a.open);
  const soonTasks = await db.task.findMany({
    where: {
      workstream: { siteId },
      status: { notIn: ["COMPLETED", "NA"] },
      targetDate: { gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()), lte: new Date(today.getTime() + 14 * 86400000) },
    },
    orderBy: { targetDate: "asc" },
    take: 8,
    include: { workstream: { select: { id: true, code: true, name: true } }, owner: { select: { initials: true, name: true } } },
  });
  const upcomingTasks = soonTasks.map((t) => ({ ...t, flag: computeFlag(t, today), days: daysUntil(t.targetDate, today) }));
  const awaitingSignOff = await db.task.findMany({
    where: { workstream: { siteId }, status: "AWAITING_SIGNOFF" },
    orderBy: { updatedAt: "asc" },
    include: { workstream: { select: { id: true, code: true, name: true } }, signOff: { select: { initials: true, name: true } } },
  });
  const openRisks = await db.risk.count({ where: { siteId, status: "OPEN" } });
  return {
    site,
    streams,
    overall,
    preCompletion: completion(all.filter((t) => t.phase === "PRE_PC")),
    postCompletion: completion(all.filter((t) => t.phase === "POST_PC")),
    atRiskCount: streams.filter((s) => s.atRisk).length,
    statusCounts,
    workload,
    upcomingTasks,
    awaitingSignOff,
    openRisks,
    upcoming: keyDates.filter((k) => (daysUntil(k.date, today) ?? -1) >= 0).slice(0, 3),
    daysToPc: daysUntil(site.pcDate, today),
    daysToGoLive: daysUntil(site.goLiveDate, today),
  };
}

export async function getContacts(siteId: string) {
  return db.contact.findMany({ where: { siteId }, orderBy: [{ organisation: "asc" }, { name: "asc" }] });
}

/** Serializable task row for the client-side task table. */
export type TaskRow = {
  id: string;
  section: string;
  title: string;
  priority: number;
  startDate: string; // YYYY-MM-DD or ""
  targetDate: string; // YYYY-MM-DD or ""
  status: string;
  progress: number;
  phase: string;
  documented: string;
  notes: string;
  flagOverride: string | null;
  overrideNote: string;
  ownerId: string | null;
  signOffId: string | null;
  collaboratorIds: string[];
  signedOffAt: string | null;
  signedOffBy: string;
  updatedBy: string | null;
  updatedAt: string;
  flag: Flag;
  updates: { id: string; authorName: string; body: string; createdAt: string }[];
};

export async function getWorkstream(siteId: string, workstreamId: string) {
  const today = new Date();
  const ws = await db.workstream.findFirst({
    where: { id: workstreamId, siteId },
    include: {
      owner: true,
      approver: true,
      tasks: {
        orderBy: { sortOrder: "asc" },
        include: {
          updatedBy: { select: { name: true } },
          updates: { orderBy: { createdAt: "desc" } },
          collaborators: { select: { id: true } },
        },
      },
    },
  });
  if (!ws) notFound();
  const tasks: TaskRow[] = ws.tasks.map((t) => ({
    id: t.id,
    section: t.section,
    title: t.title,
    priority: t.priority,
    startDate: toDateInput(t.startDate),
    targetDate: toDateInput(t.targetDate),
    status: t.status,
    progress: t.progress,
    phase: t.phase,
    documented: t.documented,
    notes: t.notes,
    flagOverride: t.flagOverride,
    overrideNote: t.overrideNote,
    ownerId: t.ownerId,
    signOffId: t.signOffId,
    collaboratorIds: t.collaborators.map((c) => c.id),
    signedOffAt: t.signedOffAt?.toISOString() ?? null,
    signedOffBy: t.signedOffBy,
    updatedBy: t.updatedBy?.name ?? null,
    updatedAt: t.updatedAt.toISOString(),
    flag: computeFlag(t, today),
    updates: t.updates.map((u) => ({ id: u.id, authorName: u.authorName, body: u.body, createdAt: u.createdAt.toISOString() })),
  }));
  return { ws, tasks, summary: workstreamSummary(ws.tasks, today) };
}

export async function getFlags(siteId: string) {
  const today = new Date();
  const tasks = await db.task.findMany({
    where: { workstream: { siteId } },
    include: {
      workstream: { select: { id: true, code: true, name: true } },
      owner: { select: { initials: true, name: true, id: true } },
      signOff: { select: { initials: true, name: true, id: true } },
      updates: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  return tasks
    .map((t) => ({ ...t, flag: computeFlag(t, today), days: daysUntil(t.targetDate, today) }))
    .filter((t) => t.flag !== "GREEN")
    .sort((a, b) => {
      if (a.flag !== b.flag) return a.flag === "RED" ? -1 : 1;
      return (a.targetDate?.getTime() ?? Infinity) - (b.targetDate?.getTime() ?? Infinity);
    });
}

/** Workstreams with their owner/approver, for the Contacts allocation table. */
export async function getAllocation(siteId: string) {
  return db.workstream.findMany({
    where: { siteId },
    orderBy: { sortOrder: "asc" },
    select: { id: true, code: true, name: true, ownerId: true, approverId: true },
  });
}
