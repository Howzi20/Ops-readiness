import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSiteFromTemplate, renumberWorkstreams, saveSiteAsTemplate } from "./templates";
import { applyWorkstreamPeople } from "./allocation";

const url = "file:./test-templates.db";
let db: PrismaClient;

beforeAll(() => {
  // throwaway test database: delete and recreate from the schema
  rmSync("prisma/test-templates.db", { force: true });
  rmSync("prisma/test-templates.db-journal", { force: true });
  execSync("npx prisma db push --skip-generate", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "ignore",
  });
  db = new PrismaClient({ datasourceUrl: url });
}, 60_000);

afterAll(async () => {
  await db?.$disconnect();
});

describe("template copying", () => {
  it("copies workstreams and tasks into a new site, independent of the template", async () => {
    const tpl = await db.template.create({
      data: {
        name: "T1",
        workstreams: {
          create: [
            {
              code: "1",
              name: "Onboarding",
              sortOrder: 0,
              tasks: {
                create: [
                  { section: "General", title: "Task A", priority: 1, phase: "PRE_PC", sortOrder: 0 },
                  { section: "General", title: "Task B", priority: 3, phase: "POST_PC", sortOrder: 1 },
                ],
              },
            },
          ],
        },
      },
    });

    const site = await createSiteFromTemplate(db, { name: "Site X", templateId: tpl.id });
    const tasks = await db.task.findMany({ where: { workstream: { siteId: site.id } }, orderBy: { sortOrder: "asc" } });
    expect(tasks.map((t) => [t.title, t.priority, t.phase, t.status, t.progress])).toEqual([
      ["Task A", 1, "PRE_PC", "TO_COMMENCE", 0],
      ["Task B", 3, "POST_PC", "TO_COMMENCE", 0],
    ]);

    // editing the template later does not touch the site
    await db.templateTask.updateMany({ where: { title: "Task A" }, data: { title: "Changed" } });
    expect(await db.task.count({ where: { title: "Task A" } })).toBe(1);

    // and a site can be saved back as a new template
    await db.task.update({ where: { id: tasks[0].id }, data: { title: "Task A (lessons learnt)" } });
    const t2 = await saveSiteAsTemplate(db, site.id, "T2");
    const t2Tasks = await db.templateTask.findMany({ where: { workstream: { templateId: t2.id } } });
    expect(t2Tasks.map((t) => t.title).sort()).toEqual(["Task A (lessons learnt)", "Task B"]);
  });

  it("numbers workstreams 1, 2, 3… with no letters, gaps or duplicates", async () => {
    const site = await createSiteFromTemplate(db, { name: "Numbers", templateId: null });
    for (const [i, code] of ["1", "1A", "2", "7A", "14"].entries()) {
      await db.workstream.create({ data: { siteId: site.id, code, name: `WS ${code}`, sortOrder: i } });
    }
    await renumberWorkstreams(db, site.id);
    const list = await db.workstream.findMany({ where: { siteId: site.id }, orderBy: { sortOrder: "asc" } });
    expect(list.map((w) => [w.code, w.name])).toEqual([
      ["1", "WS 1"],
      ["2", "WS 1A"],
      ["3", "WS 2"],
      ["4", "WS 7A"],
      ["5", "WS 14"],
    ]);
  });

  it("creates an empty site when no template is chosen", async () => {
    const site = await createSiteFromTemplate(db, { name: "Blank", templateId: null });
    expect(await db.workstream.count({ where: { siteId: site.id } })).toBe(0);
  });
});

describe("workstream owner / approver flow to tasks", () => {
  it("overwrites open tasks, keeps closed ones, and reports tasks that need a new approval email", async () => {
    const site = await createSiteFromTemplate(db, { name: "Alloc", templateId: null });
    const [a, b] = await Promise.all([
      db.contact.create({ data: { siteId: site.id, name: "Ann", initials: "AN" } }),
      db.contact.create({ data: { siteId: site.id, name: "Bob", initials: "BO" } }),
    ]);
    const ws = await db.workstream.create({ data: { siteId: site.id, code: "1", name: "WS", sortOrder: 0 } });
    const mk = (title: string, status: string, signOffId: string | null = null) =>
      db.task.create({ data: { workstreamId: ws.id, title, sortOrder: 0, status, signOffId, progress: status === "AWAITING_SIGNOFF" ? 100 : 0 } });
    const open = await mk("open", "IN_PROGRESS");
    const waiting = await mk("waiting", "AWAITING_SIGNOFF", a.id);
    const done = await mk("done", "COMPLETED", a.id);
    const na = await mk("na", "NA");

    const r = await applyWorkstreamPeople(db, ws.id, { approverId: b.id, ownerId: a.id });
    const get = (id: string) => db.task.findUniqueOrThrow({ where: { id } });
    expect((await get(open.id)).signOffId).toBe(b.id);
    expect((await get(open.id)).ownerId).toBe(a.id);
    expect((await get(waiting.id)).signOffId).toBe(b.id);
    expect((await get(done.id)).signOffId).toBe(a.id); // closed tasks keep their history
    expect((await get(na.id)).signOffId).toBeNull();
    expect(r.newlyAwaitingApprover).toEqual([waiting.id]); // re-notify the new approver

    // removing the approver sends waiting tasks back to In Progress
    await applyWorkstreamPeople(db, ws.id, { approverId: null });
    expect(await get(waiting.id)).toMatchObject({ signOffId: null, status: "IN_PROGRESS" });
  });
});
