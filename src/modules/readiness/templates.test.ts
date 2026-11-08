import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSiteFromTemplate, saveSiteAsTemplate } from "./templates";

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

  it("creates an empty site when no template is chosen", async () => {
    const site = await createSiteFromTemplate(db, { name: "Blank", templateId: null });
    expect(await db.workstream.count({ where: { siteId: site.id } })).toBe(0);
  });
});
