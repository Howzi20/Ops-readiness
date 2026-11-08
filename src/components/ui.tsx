import Link from "next/link";
import type { Flag } from "@/modules/readiness/constants";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export const btn = {
  primary:
    "inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-accent-strong disabled:opacity-50",
  secondary:
    "inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink hover:bg-canvas disabled:opacity-50",
  danger:
    "inline-flex items-center gap-1.5 rounded-md border border-rag-red/40 bg-white px-3 py-1.5 text-sm font-medium text-rag-red hover:bg-rag-red-soft",
  ghost: "inline-flex items-center gap-1 rounded px-2 py-1 text-sm text-muted hover:bg-canvas hover:text-ink",
};

/** form control without width — combine with a width class */
export const field =
  "rounded-md border border-line bg-white px-2.5 py-1.5 text-sm text-ink shadow-xs outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";
export const input = `${field} w-full`;
export const label = "block text-xs font-medium uppercase tracking-wide text-muted mb-1";

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cx("rounded-lg border border-line bg-panel shadow-xs", className)}>{children}</div>;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  back,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {back && (
          <Link href={back.href} className="mb-1 inline-block text-sm text-muted hover:text-accent">
            ← {back.label}
          </Link>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const FLAG_STYLE: Record<Flag, string> = {
  RED: "bg-rag-red",
  YELLOW: "bg-rag-yellow",
  GREEN: "bg-rag-green",
};
const FLAG_NAME: Record<Flag, string> = { RED: "Red", YELLOW: "Yellow", GREEN: "Green" };

export function FlagDot({ flag, overridden }: { flag: Flag; overridden?: boolean }) {
  return (
    <span
      title={`${FLAG_NAME[flag]}${overridden ? " (manual override)" : ""}`}
      className={cx(
        "inline-block h-3 w-3 shrink-0 rounded-full",
        FLAG_STYLE[flag],
        overridden && "ring-2 ring-offset-1 ring-ink/60",
      )}
    />
  );
}

export function FlagPill({ flag }: { flag: Flag }) {
  const soft = { RED: "bg-rag-red-soft text-rag-red", YELLOW: "bg-rag-yellow-soft text-[#94690a]", GREEN: "bg-rag-green-soft text-rag-green" }[flag];
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium", soft)}>
      <span className={cx("h-2 w-2 rounded-full", FLAG_STYLE[flag])} />
      {FLAG_NAME[flag]}
    </span>
  );
}

export function ProgressBar({ value, className }: { value: number | null; className?: string }) {
  const v = value ?? 0;
  return (
    <div className={cx("h-1.5 w-full overflow-hidden rounded-full bg-line", className)}>
      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.max(0, Math.min(100, v))}%` }} />
    </div>
  );
}

export function pct(v: number | null) {
  return v === null ? "—" : `${Math.round(v)}%`;
}

export function Countdown({ days, label }: { days: number | null; label: string }) {
  if (days === null) return <span className="text-muted">{label}: not set</span>;
  const text = days === 0 ? "today" : days > 0 ? `${days} days to go` : `${-days} days ago`;
  return (
    <span>
      <span className="font-semibold text-ink tabular">{label}</span> <span className="text-muted">· {text}</span>
    </span>
  );
}

export function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "red" | "yellow" | "accent" }) {
  const color = tone === "red" ? "text-rag-red" : tone === "yellow" ? "text-[#94690a]" : tone === "accent" ? "text-accent" : "text-ink";
  return (
    <Card className="px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className={cx("mt-1 text-2xl font-semibold tabular", color)}>{value}</div>
    </Card>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed border-line bg-white/50 px-6 py-10 text-center text-sm text-muted">{children}</div>;
}
