import { cx } from "./ui";

const AVATAR_COLORS = ["#0e7c86", "#6c72c9", "#e07a2e", "#2f8fd1", "#b5517d", "#4f9a3a", "#8a6dc7", "#c98a12", "#3c4b5c"];

function colorFor(key: string) {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function Avatar({ initials, name, size = 26, className }: { initials: string; name?: string; size?: number; className?: string }) {
  return (
    <span
      title={name}
      className={cx("inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white ring-2 ring-white", className)}
      style={{ width: size, height: size, fontSize: Math.max(9, size * 0.38), background: colorFor(initials || name || "?") }}
    >
      {initials.slice(0, 3)}
    </span>
  );
}

export function EmptyAvatar({ size = 26 }: { size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-muted/50 text-muted/70"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      +
    </span>
  );
}
