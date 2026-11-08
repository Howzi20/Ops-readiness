import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { NewSiteForm } from "./NewSiteForm";

export const metadata = { title: "New site" };

export default async function NewSitePage() {
  const templates = await db.template.findMany({
    orderBy: { name: "asc" },
    include: { workstreams: { select: { _count: { select: { tasks: true } } } } },
  });
  return (
    <>
      <PageHeader title="New site" back={{ href: "/readiness", label: "Sites" }} subtitle="The template's workstreams and tasks are copied into the new site. Target dates are set per task afterwards." />
      <NewSiteForm
        templates={templates.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          workstreams: t.workstreams.length,
          tasks: t.workstreams.reduce((n, w) => n + w._count.tasks, 0),
        }))}
      />
    </>
  );
}
