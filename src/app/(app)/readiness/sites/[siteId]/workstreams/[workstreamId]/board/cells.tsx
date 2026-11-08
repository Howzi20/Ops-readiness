"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Avatar, EmptyAvatar } from "@/components/Avatar";
import { cx } from "@/components/ui";
import { PRIORITY_COLOR, STATUSES, STATUS_COLOR, STATUS_LABEL, type Status } from "@/modules/readiness/constants";

export type Contact = { id: string; initials: string; name: string };

/** Small floating menu anchored to a button; renders in a portal so table overflow can't clip it. */
export function Popover({
  anchor,
  onClose,
  children,
  width = 200,
}: {
  anchor: HTMLElement | null;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const left = Math.min(Math.max(8, r.left + r.width / 2 - width / 2), window.innerWidth - width - 8);
    const below = r.bottom + 6;
    const h = ref.current?.offsetHeight ?? 200;
    const top = below + h > window.innerHeight - 8 ? Math.max(8, r.top - h - 6) : below;
    setPos({ top, left });
  }, [anchor, width]);

  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (ref.current?.contains(e.target as Node) || anchor?.contains(e.target as Node)) return;
      onClose();
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const scroll = (e: Event) => !ref.current?.contains(e.target as Node) && onClose();
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", scroll, true);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", scroll, true);
    };
  }, [anchor, onClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={ref}
      role="menu"
      className="fixed z-[60] rounded-lg border border-line bg-white p-1.5 shadow-xl"
      style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width }}
    >
      {children}
    </div>,
    document.body,
  );
}

function useAnchor() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return { anchor, open: (e: React.MouseEvent<HTMLElement>) => setAnchor(e.currentTarget), close: () => setAnchor(null) };
}

export function StatusPill({ status, className }: { status: string; className?: string }) {
  const c = STATUS_COLOR[status as Status] ?? STATUS_COLOR.TO_COMMENCE;
  return (
    <span className={cx("inline-flex items-center justify-center rounded px-2 py-0.5 text-xs font-medium", className)} style={{ background: c.bg, color: c.fg }}>
      {STATUS_LABEL[status as Status] ?? status}
    </span>
  );
}

/** Full-colour status cell; click to choose. */
export function StatusCell({ value, onChange }: { value: string; onChange: (s: Status) => void }) {
  const { anchor, open, close } = useAnchor();
  const c = STATUS_COLOR[value as Status] ?? STATUS_COLOR.TO_COMMENCE;
  return (
    <>
      <button
        aria-label="status"
        onClick={open}
        className="flex h-full min-h-9 w-full items-center justify-center px-2 text-[13px] font-medium transition hover:brightness-95"
        style={{ background: c.bg, color: c.fg }}
      >
        {STATUS_LABEL[value as Status] ?? value}
      </button>
      {anchor && (
        <Popover anchor={anchor} onClose={close} width={180}>
          <div className="space-y-1">
            {STATUSES.map((s) => (
              <button
                key={s}
                role="menuitem"
                onClick={() => {
                  close();
                  if (s !== value) onChange(s);
                }}
                className={cx("block w-full rounded px-2 py-1.5 text-center text-[13px] font-medium hover:brightness-95", s === value && "ring-2 ring-ink/30 ring-offset-1")}
                style={{ background: STATUS_COLOR[s].bg, color: STATUS_COLOR[s].fg }}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </Popover>
      )}
    </>
  );
}

export function PriorityCell({ value, onChange, long }: { value: number; onChange: (p: number) => void; long?: boolean }) {
  const { anchor, open, close } = useAnchor();
  const c = PRIORITY_COLOR[value] ?? PRIORITY_COLOR[2];
  return (
    <>
      <button
        aria-label="priority"
        onClick={open}
        className="flex h-full min-h-9 w-full items-center justify-center px-2 text-[13px] font-medium hover:brightness-95"
        style={{ background: c.bg, color: c.fg }}
        title={c.label}
      >
        {long ? `Priority ${value}` : value}
      </button>
      {anchor && (
        <Popover anchor={anchor} onClose={close} width={170}>
          <div className="space-y-1">
            {[1, 2, 3].map((p) => (
              <button
                key={p}
                role="menuitem"
                onClick={() => {
                  close();
                  if (p !== value) onChange(p);
                }}
                className="block w-full rounded px-2 py-1.5 text-center text-[13px] font-medium hover:brightness-95"
                style={{ background: PRIORITY_COLOR[p].bg, color: PRIORITY_COLOR[p].fg }}
              >
                {PRIORITY_COLOR[p].label}
              </button>
            ))}
          </div>
        </Popover>
      )}
    </>
  );
}

/** Avatar for one role (Owner / Approver); click to pick a person. */
export function PersonCell({
  value,
  contacts,
  role,
  onChange,
}: {
  value: string | null;
  contacts: Contact[];
  role: string;
  onChange: (id: string | null) => void;
}) {
  const { anchor, open, close } = useAnchor();
  const [q, setQ] = useState("");
  const person = contacts.find((c) => c.id === value);
  const list = contacts.filter((c) => !q || `${c.name} ${c.initials}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <button aria-label={role} onClick={open} className="flex h-full min-h-9 w-full items-center justify-center hover:bg-canvas" title={person ? `${role}: ${person.name}` : `Assign ${role}`}>
        {person ? <Avatar initials={person.initials} name={person.name} /> : <span className="opacity-40 hover:opacity-100"><EmptyAvatar /></span>}
      </button>
      {anchor && (
        <Popover anchor={anchor} onClose={close} width={240}>
          <div className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{role}</div>
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search people"
            className="mb-1 w-full rounded border border-line px-2 py-1 text-sm outline-none focus:border-accent"
          />
          <div className="max-h-64 overflow-y-auto">
            {list.map((c) => (
              <button
                key={c.id}
                role="menuitem"
                onClick={() => {
                  close();
                  onChange(c.id);
                }}
                className={cx("flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-canvas", c.id === value && "bg-accent-soft")}
              >
                <Avatar initials={c.initials} size={22} />
                <span className="truncate">{c.name}</span>
              </button>
            ))}
            {contacts.length === 0 && <p className="px-2 py-2 text-xs text-muted">Add people on the Contacts tab first.</p>}
          </div>
          {person && (
            <button
              onClick={() => {
                close();
                onChange(null);
              }}
              className="mt-1 w-full rounded px-2 py-1 text-left text-xs text-muted hover:bg-canvas hover:text-rag-red"
            >
              Remove {person.name}
            </button>
          )}
        </Popover>
      )}
    </>
  );
}

/** Stacked avatars for a compact "people" display (cards, timeline). */
export function AvatarStack({ ids, contacts, size = 22 }: { ids: (string | null)[]; contacts: Contact[]; size?: number }) {
  const people = [...new Set(ids.filter(Boolean))].map((id) => contacts.find((c) => c.id === id)).filter(Boolean) as Contact[];
  if (!people.length) return null;
  return (
    <span className="flex -space-x-1.5">
      {people.map((p) => <Avatar key={p.id} initials={p.initials} name={p.name} size={size} />)}
    </span>
  );
}

/** Proportional bar of statuses, used in group footers and the dashboard. */
export function StatusBar({ counts, total, height = 8 }: { counts: Record<string, number>; total: number; height?: number }) {
  if (!total) return <div className="w-full rounded-full bg-line" style={{ height }} />;
  return (
    <div className="flex w-full gap-[2px] overflow-hidden rounded-full" style={{ height }}>
      {STATUSES.filter((s) => counts[s]).map((s) => (
        <div
          key={s}
          title={`${STATUS_LABEL[s]}: ${counts[s]} of ${total} (${Math.round((counts[s] / total) * 100)}%)`}
          style={{ width: `${(counts[s] / total) * 100}%`, background: STATUS_COLOR[s].bg }}
        />
      ))}
    </div>
  );
}

/** Avatar stack + picker for any number of collaborators. */
export function CollaboratorsCell({
  value,
  contacts,
  exclude,
  onChange,
}: {
  value: string[];
  contacts: Contact[];
  exclude: (string | null)[];
  onChange: (ids: string[]) => void;
}) {
  const { anchor, open, close } = useAnchor();
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  const options = contacts.filter((c) => !exclude.includes(c.id) || value.includes(c.id));
  return (
    <>
      <button aria-label="Collaborators" onClick={open} className="flex min-h-9 items-center gap-2 rounded px-1 hover:bg-canvas">
        {value.length ? <AvatarStack ids={value} contacts={contacts} size={26} /> : <EmptyAvatar />}
        <span className="text-xs text-muted">
          {value.length ? `${value.length} collaborator${value.length === 1 ? "" : "s"}` : "Add collaborators"}
        </span>
      </button>
      {anchor && (
        <Popover anchor={anchor} onClose={close} width={250}>
          <div className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">Collaborators</div>
          <div className="max-h-64 overflow-y-auto">
            {options.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-canvas">
                <input type="checkbox" checked={value.includes(c.id)} onChange={() => toggle(c.id)} />
                <Avatar initials={c.initials} size={22} />
                <span className="truncate">{c.name}</span>
              </label>
            ))}
            {options.length === 0 && <p className="px-2 py-2 text-xs text-muted">Add people on the Contacts tab first.</p>}
          </div>
        </Popover>
      )}
    </>
  );
}
