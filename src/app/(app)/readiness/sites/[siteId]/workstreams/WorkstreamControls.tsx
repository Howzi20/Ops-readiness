"use client";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { addWorkstream, setWorkstreamPerson } from "@/modules/readiness/actions";
import { btn, field, input } from "@/components/ui";

export function PersonSelect({
  workstreamId,
  role,
  value,
  options,
}: {
  workstreamId: string;
  role: "ownerId" | "approverId";
  value: string;
  options: { id: string; label: string }[];
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const [pending, start] = useTransition();
  return (
    <select
      aria-label={role === "ownerId" ? "Workstream owner" : "Workstream approver"}
      className={input + " py-1"}
      value={v}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        const prev = v;
        setV(next);
        start(async () => {
          const r = await setWorkstreamPerson(workstreamId, role, next || null);
          if (!r.ok) setV(prev);
        });
      }}
    >
      <option value="">{role === "ownerId" ? "— No owner —" : "— No approver —"}</option>
      {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  );
}

export function AddWorkstreamForm({ siteId }: { siteId: string }) {
  const [state, action, pending] = useActionState(addWorkstream.bind(null, siteId), undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="flex flex-wrap items-center gap-2">
      <input name="name" placeholder="New workstream name" className={field + " w-72"} />
      <button className={btn.secondary} disabled={pending}>+ Add workstream</button>
      {state && !state.ok && <span className="text-sm text-rag-red">{state.error}</span>}
    </form>
  );
}
