"use client";
import { useActionState } from "react";
import { createTemplate } from "@/modules/readiness/actions";
import { btn, Card, input } from "@/components/ui";

export function NewTemplateForm() {
  const [state, action, pending] = useActionState(createTemplate, undefined);
  return (
    <Card className="h-fit p-4">
      <form action={action} className="space-y-3">
        <h2 className="font-semibold text-ink">New blank template</h2>
        <p className="text-xs text-muted">Or open an existing template and duplicate it, or save a site as a template from its Settings tab.</p>
        <input name="name" placeholder="e.g. Takeover from incumbent" className={input} />
        <input name="description" placeholder="Description" className={input} />
        <button className={btn.primary} disabled={pending}>Create</button>
        {state && !state.ok && <p className="text-sm text-rag-red">{state.error}</p>}
      </form>
    </Card>
  );
}
