"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { field, input } from "@/components/ui";

type Opt = { id: string; label: string };

export function FlagFilters({ contacts, streams }: { contacts: Opt[]; streams: Opt[] }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(sp);
    if (v) next.set(k, v);
    else next.delete(k);
    router.replace(`${path}?${next}`);
  };
  return (
    <div className="ml-auto flex flex-wrap gap-2">
      <select className={field + " w-auto"} value={sp.get("flag") ?? ""} onChange={(e) => set("flag", e.target.value)}>
        <option value="">Red & yellow</option>
        <option value="RED">Red only</option>
        <option value="YELLOW">Yellow only</option>
      </select>
      <select className={field + " w-auto"} value={sp.get("workstream") ?? ""} onChange={(e) => set("workstream", e.target.value)}>
        <option value="">All workstreams</option>
        {streams.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      <select className={field + " w-auto"} value={sp.get("person") ?? ""} onChange={(e) => set("person", e.target.value)}>
        <option value="">Any owner / sign-off</option>
        {contacts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </div>
  );
}
