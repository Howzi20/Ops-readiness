import Link from "next/link";
import { db } from "@/lib/db";
import { Card, Empty, PageHeader } from "@/components/ui";
import { NewTemplateForm } from "./NewTemplateForm";

export const metadata = { title: "Templates" };

export default async function TemplatesPage() {
  const templates = await db.template.findMany({
    orderBy: { name: "asc" },
    include: { workstreams: { select: { _count: { select: { tasks: true } } } }, _count: { select: { sites: true } } },
  });
  return (
    <>
      <PageHeader title="Site templates" subtitle="A new site starts as a copy of a template. Editing a template only affects sites created afterwards." />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-3">
          {templates.length === 0 && <Empty>No templates yet.</Empty>}
          {templates.map((t) => (
            <Link key={t.id} href={`/readiness/templates/${t.id}`} className="block">
              <Card className="p-4 transition hover:border-accent/50 hover:shadow-md">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold text-ink">{t.name}</span>
                  <span className="text-xs text-muted tabular">
                    {t.workstreams.length} workstreams · {t.workstreams.reduce((n, w) => n + w._count.tasks, 0)} tasks · used by {t._count.sites} site{t._count.sites === 1 ? "" : "s"}
                  </span>
                </div>
                {t.description && <p className="mt-1 text-sm text-muted">{t.description}</p>}
              </Card>
            </Link>
          ))}
        </div>
        <NewTemplateForm />
      </div>
    </>
  );
}
