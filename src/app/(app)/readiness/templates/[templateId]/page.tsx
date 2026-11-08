import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { TemplateEditor } from "./TemplateEditor";

export default async function TemplatePage({
  params,
  searchParams,
}: {
  params: Promise<{ templateId: string }>;
  searchParams: Promise<{ ws?: string }>;
}) {
  const { templateId } = await params;
  const { ws } = await searchParams;
  const t = await db.template.findUnique({
    where: { id: templateId },
    include: {
      _count: { select: { sites: true } },
      workstreams: { orderBy: { sortOrder: "asc" }, include: { tasks: { orderBy: { sortOrder: "asc" } } } },
    },
  });
  if (!t) notFound();
  const selected = t.workstreams.find((w) => w.id === ws) ?? t.workstreams[0] ?? null;
  return (
    <>
      <PageHeader title={t.name} back={{ href: "/readiness/templates", label: "Templates" }} subtitle={t.description || undefined} />
      <TemplateEditor
        template={{ id: t.id, name: t.name, description: t.description, sites: t._count.sites }}
        workstreams={t.workstreams.map((w) => ({ id: w.id, code: w.code, name: w.name, count: w.tasks.length }))}
        selected={
          selected && {
            id: selected.id,
            name: selected.name,
            tasks: selected.tasks.map((x) => ({ id: x.id, section: x.section, title: x.title, priority: x.priority, phase: x.phase })),
          }
        }
      />
    </>
  );
}
