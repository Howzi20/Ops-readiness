/**
 * Seeds: first login, the "New build (standard)" template, and a demo site with fictional contacts.
 * Safe to re-run: existing records are left alone.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import template from "./template-new-build.json";
import { createSiteFromTemplate } from "../../src/modules/readiness/templates";

const db = new PrismaClient();

const ADMIN_EMAIL = "admin@readiness.local";
const ADMIN_PASSWORD = "readiness";

type TemplateJson = {
  name: string;
  description: string;
  workstreams: { code: string; name: string; tasks: { section: string; title: string; priority: number; phase: string }[] }[];
};

async function seedTemplate(t: TemplateJson) {
  const existing = await db.template.findUnique({ where: { name: t.name } });
  if (existing) return existing;
  return db.template.create({
    data: {
      name: t.name,
      description: t.description,
      workstreams: {
        create: t.workstreams.map((ws, i) => ({
          code: ws.code,
          name: ws.name,
          sortOrder: i,
          tasks: { create: ws.tasks.map((task, j) => ({ ...task, sortOrder: j })) },
        })),
      },
    },
  });
}

const addDays = (n: number) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
};

async function seedDemoSite(templateId: string) {
  const name = "Harbour Point Tower (Demo)";
  if (await db.site.findFirst({ where: { name } })) return;

  const site = await createSiteFromTemplate(db, {
    name,
    client: "Demo Property Group",
    address: "1 Example Street, Sydney NSW",
    templateId,
    transitionStart: addDays(-240),
    pcDate: addDays(45),
    goLiveDate: addDays(60),
  });

  const people = [
    { name: "Alex Morgan", organisation: "TEAM", role: "Operations Manager", initials: "AM" },
    { name: "Priya Shah", organisation: "TEAM", role: "General Manager", initials: "PS" },
    { name: "Sam Lee", organisation: "TEAM", role: "Transition Manager", initials: "SL" },
    { name: "Jordan Blake", organisation: "TEAM", role: "Building Technology Manager", initials: "JB" },
    { name: "Chris Taylor", organisation: "TEAM", role: "Finance Manager", initials: "CT" },
    { name: "Robin Patel", organisation: "CLIENT", role: "Asset Manager", initials: "RP" },
    { name: "Casey Nguyen", organisation: "CLIENT", role: "Development Manager", initials: "CN" },
  ];
  const contacts = [];
  for (const p of people) contacts.push(await db.contact.create({ data: { ...p, siteId: site.id, email: `${p.initials.toLowerCase()}@example.com` } }));
  const byInit = Object.fromEntries(contacts.map((c) => [c.initials, c.id]));

  const owners: Record<string, string> = { "1": "SL", "1A": "PS", "2": "AM", "3": "PS", "4": "JB", "4A": "JB", "5": "CT", "6": "PS", "7": "AM", "7A": "CT", "8": "PS", "9": "AM", "14": "SL" };
  const streams = await db.workstream.findMany({ where: { siteId: site.id }, include: { tasks: { orderBy: { sortOrder: "asc" } } } });

  // Give the demo a realistic spread of progress so the dashboard and flags have something to show.
  let n = 0;
  for (const ws of streams) {
    const owner = byInit[owners[ws.code]];
    await db.workstream.update({ where: { id: ws.id }, data: { ownerId: owner } });
    for (const t of ws.tasks) {
      n++;
      const r = (n * 37) % 100;
      const post = t.phase === "POST_PC";
      // priority-1 tasks need client sign-off in the demo; others complete on the owner's say-so
      const signOffId = t.priority === 1 ? byInit.RP : null;
      let data: Record<string, unknown> = { ownerId: owner, signOffId };
      const span = 7 + (n % 4) * 7; // 1–4 week duration for tasks that get a start date
      if (post) data = { ...data, targetDate: addDays(70 + (n % 40)) };
      else if (r < 45) {
        const end = -60 + (n % 50);
        data = {
          ...data,
          status: "COMPLETED",
          progress: 100,
          startDate: addDays(end - span),
          targetDate: addDays(end),
          documented: "YES",
          ...(signOffId ? { signedOffAt: addDays(end), signedOffBy: "Robin Patel" } : {}),
        };
      } else if (r < 60) data = { ...data, status: "NA" };
      else if (r < 66) {
        const end = -(n % 10) - 1;
        data = { ...data, status: "DELAYED", progress: 30, startDate: addDays(end - span), targetDate: addDays(end) };
      } else if (r < 70 && signOffId) {
        const end = (n % 10) - 5;
        data = { ...data, status: "AWAITING_SIGNOFF", progress: 100, startDate: addDays(end - span), targetDate: addDays(end) };
      } else if (r < 82) {
        const end = (n % 20) + 1;
        data = { ...data, status: "IN_PROGRESS", progress: [20, 40, 60, 80][n % 4], startDate: addDays(end - span), targetDate: addDays(end) };
      } else data = { ...data, targetDate: addDays(20 + (n % 30)) };
      await db.task.update({ where: { id: t.id }, data });
    }
  }

  // a few sample updates on delayed / in-progress tasks
  const sample = await db.task.findMany({
    where: { workstream: { siteId: site.id }, status: { in: ["DELAYED", "IN_PROGRESS"] } },
    take: 12,
    orderBy: { sortOrder: "asc" },
  });
  const notes = [
    ["Alex Morgan", "Chased the builder again today — waiting on revised programme."],
    ["Priya Shah", "Client has asked for this to be reviewed at next week's readiness meeting."],
    ["Sam Lee", "Draft circulated for comment. Feedback due Friday."],
    ["Jordan Blake", "Vendor confirmed attendance on site Tuesday."],
  ];
  for (const [i, t] of sample.entries()) {
    const [authorName, body] = notes[i % notes.length];
    await db.taskUpdate.create({ data: { taskId: t.id, authorName, body, createdAt: new Date(Date.now() - (i + 1) * 5 * 3600 * 1000) } });
  }

  await db.keyDate.createMany({
    data: [
      { siteId: site.id, name: "Base building handover walk", date: addDays(30) },
      { siteId: site.id, name: "First tenant fit-out start", date: addDays(75) },
    ],
  });
  await db.risk.createMany({
    data: [
      { siteId: site.id, number: 1, function: "Operations", description: "Internet / broadband services not connected before PC", identifiedBy: "AM", severity: "MEDIUM", likelihood: "MEDIUM", responsible: "Builder", targetDate: addDays(30), action: "Weekly follow-up with builder and ISP." },
      { siteId: site.id, number: 2, function: "Operational Technology", description: "Lift access module end-of-life", identifiedBy: "JB", severity: "MEDIUM", likelihood: "HIGH", responsible: "JB", targetDate: addDays(10), action: "Reader upgrade scheduled post PC." },
      { siteId: site.id, number: 3, function: "Engineering", description: "Minimum building standards omissions", identifiedBy: "AM", severity: "LOW", likelihood: "MEDIUM", responsible: "AM", action: "Captured in capex budget.", status: "CLOSED" },
    ],
  });
}

async function main() {
  if (!(await db.user.findUnique({ where: { email: ADMIN_EMAIL } }))) {
    await db.user.create({ data: { name: "Admin", email: ADMIN_EMAIL, passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10) } });
    console.log(`Created login  ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}  (change it after first login)`);
  }
  const tpl = await seedTemplate(template as TemplateJson);
  await seedDemoSite(tpl.id);
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
