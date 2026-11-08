"use client";
import { useActionState, useEffect, useRef } from "react";
import { addKeyDate, deleteKeyDate } from "@/modules/readiness/actions";
import { btn, field, input } from "@/components/ui";

export function AddKeyDate({ siteId }: { siteId: string }) {
  const [state, action, pending] = useActionState(addKeyDate.bind(null, siteId), undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="flex flex-wrap items-center gap-2">
      <input name="name" placeholder="Milestone name" className={field + " w-72"} />
      <input name="date" type="date" className={field + " w-auto"} />
      <button className={btn.secondary} disabled={pending}>+ Add milestone</button>
      {state && !state.ok && <span className="text-sm text-rag-red">{state.error}</span>}
    </form>
  );
}

export function DeleteKeyDate({ siteId, id }: { siteId: string; id: string }) {
  return (
    <button className="text-xs text-muted hover:text-rag-red" onClick={() => confirm("Remove this milestone?") && deleteKeyDate(siteId, id)}>
      Remove
    </button>
  );
}
