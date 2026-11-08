import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = PrismaClient | Prisma.TransactionClient;

export type NewSiteInput = {
  name: string;
  client?: string;
  address?: string;
  templateId: string | null;
  transitionStart?: Date | null;
  pcDate?: Date | null;
  goLiveDate?: Date | null;
};

/** Create a site and deep-copy the template's workstreams and tasks into it. */
export async function createSiteFromTemplate(db: PrismaClient, input: NewSiteInput) {
  return db.$transaction(async (tx) => {
    const site = await tx.site.create({
      data: {
        name: input.name,
        client: input.client ?? "",
        address: input.address ?? "",
        templateId: input.templateId,
        transitionStart: input.transitionStart ?? null,
        pcDate: input.pcDate ?? null,
        goLiveDate: input.goLiveDate ?? null,
      },
    });
    if (input.templateId) await copyTemplateInto(tx, input.templateId, site.id);
    return site;
  });
}

async function copyTemplateInto(tx: Tx, templateId: string, siteId: string) {
  const streams = await tx.templateWorkstream.findMany({
    where: { templateId },
    include: { tasks: { orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });
  for (const ws of streams) {
    await tx.workstream.create({
      data: {
        siteId,
        code: ws.code,
        name: ws.name,
        sortOrder: ws.sortOrder,
        tasks: {
          create: ws.tasks.map((t) => ({
            section: t.section,
            title: t.title,
            priority: t.priority,
            phase: t.phase,
            sortOrder: t.sortOrder,
          })),
        },
      },
    });
  }
}

/** Save a site's current workstreams & task list (wording only) as a new template. */
export async function saveSiteAsTemplate(db: PrismaClient, siteId: string, name: string, description = "") {
  const streams = await db.workstream.findMany({
    where: { siteId },
    include: { tasks: { orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });
  return db.template.create({
    data: {
      name,
      description,
      workstreams: {
        create: streams.map((ws) => ({
          code: ws.code,
          name: ws.name,
          sortOrder: ws.sortOrder,
          tasks: {
            create: ws.tasks.map((t) => ({
              section: t.section,
              title: t.title,
              priority: t.priority,
              phase: t.phase,
              sortOrder: t.sortOrder,
            })),
          },
        })),
      },
    },
  });
}

/** Duplicate a template under a new name. */
export async function duplicateTemplate(db: PrismaClient, templateId: string, name: string) {
  const src = await db.template.findUniqueOrThrow({
    where: { id: templateId },
    include: { workstreams: { include: { tasks: true } } },
  });
  return db.template.create({
    data: {
      name,
      description: src.description,
      workstreams: {
        create: src.workstreams.map((ws) => ({
          code: ws.code,
          name: ws.name,
          sortOrder: ws.sortOrder,
          tasks: {
            create: ws.tasks.map((t) => ({
              section: t.section,
              title: t.title,
              priority: t.priority,
              phase: t.phase,
              sortOrder: t.sortOrder,
            })),
          },
        })),
      },
    },
  });
}
