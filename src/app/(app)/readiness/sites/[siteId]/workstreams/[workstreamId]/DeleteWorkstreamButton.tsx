"use client";
import { deleteWorkstream } from "@/modules/readiness/actions";
import { btn } from "@/components/ui";

export function DeleteWorkstreamButton({ id, name }: { id: string; name: string }) {
  return (
    <button
      className={btn.ghost}
      onClick={async () => {
        if (confirm(`Delete workstream "${name}" and all of its tasks? This cannot be undone.`)) await deleteWorkstream(id);
      }}
    >
      Delete workstream
    </button>
  );
}
