import { YELLOW_PROGRESS_BELOW, YELLOW_WINDOW_DAYS, type Flag } from "./constants";

export type FlagInput = {
  status: string;
  progress: number;
  targetDate: Date | null;
  flagOverride: string | null;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Whole calendar days from `today` to `date` (negative when in the past). */
export function daysUntil(date: Date | null, today = new Date()): number | null {
  if (!date) return null;
  return Math.round((startOfDay(date).getTime() - startOfDay(today).getTime()) / MS_PER_DAY);
}

export function isClosed(status: string) {
  return status === "COMPLETED" || status === "NA";
}

export function computeFlag(task: FlagInput, today = new Date()): Flag {
  if (task.flagOverride === "RED" || task.flagOverride === "YELLOW" || task.flagOverride === "GREEN") {
    return task.flagOverride;
  }
  const days = daysUntil(task.targetDate, today);
  if (days === null || isClosed(task.status)) return "GREEN";
  if (days < 0) return "RED";
  if (days <= YELLOW_WINDOW_DAYS && task.progress < YELLOW_PROGRESS_BELOW) return "YELLOW";
  return "GREEN";
}

/** Average progress (0–100) of tasks, excluding N/A. Null when nothing counts. */
export function completion(tasks: { status: string; progress: number }[]): number | null {
  const counted = tasks.filter((t) => t.status !== "NA");
  if (counted.length === 0) return null;
  return counted.reduce((sum, t) => sum + t.progress, 0) / counted.length;
}

export function workstreamSummary(tasks: FlagInput[], today = new Date()) {
  let red = 0;
  let yellow = 0;
  for (const t of tasks) {
    const f = computeFlag(t, today);
    if (f === "RED") red++;
    else if (f === "YELLOW") yellow++;
  }
  return {
    total: tasks.length,
    done: tasks.filter((t) => t.status === "COMPLETED").length,
    completion: completion(tasks),
    red,
    yellow,
    atRisk: red > 0,
  };
}

export type TaskUpdate = {
  status?: string;
  progress?: number;
  flagOverride?: string | null;
  overrideNote?: string;
};

/** Apply the cross-field rules to a task edit. Throws on invalid combinations. */
export function normaliseTaskUpdate<T extends TaskUpdate>(update: T): T {
  const out = { ...update };
  if (out.progress !== undefined) out.progress = Math.max(0, Math.min(100, Math.round(out.progress)));
  if (out.status === "COMPLETED") out.progress = 100;
  if (out.flagOverride !== undefined) {
    if (out.flagOverride) {
      if (!out.overrideNote?.trim()) throw new Error("A reason is required when overriding the flag");
      out.overrideNote = out.overrideNote.trim();
    } else {
      out.overrideNote = "";
    }
  }
  return out;
}

export type SignOffUpdate = {
  status?: string;
  progress?: number;
  signOffId?: string | null;
  signedOffAt?: Date | null;
  signedOffBy?: string;
};

/**
 * Sign-off workflow. A task with a sign-off person can't go straight to Completed:
 * reaching 100% (or choosing Completed) moves it to Awaiting sign-off, and only an
 * approval (see `approveSignOff` action) completes it.
 */
export function applySignOff<T extends SignOffUpdate>(
  update: T,
  current: { status: string; progress: number; signOffId: string | null },
): T & SignOffUpdate {
  const out: T & SignOffUpdate = { ...update };
  const signOff = out.signOffId !== undefined ? out.signOffId : current.signOffId;
  const status = out.status ?? current.status;

  if (out.status === "AWAITING_SIGNOFF" && !signOff) throw new Error("Choose a sign-off person first");

  if (signOff) {
    if (out.status === "COMPLETED" && current.status !== "COMPLETED") {
      out.status = "AWAITING_SIGNOFF";
      out.progress = 100;
    } else if (out.progress === 100 && !["COMPLETED", "AWAITING_SIGNOFF", "NA"].includes(status)) {
      out.status = "AWAITING_SIGNOFF";
    }
  }

  const finalStatus = out.status ?? current.status;
  if (finalStatus === "AWAITING_SIGNOFF") {
    // explicitly choosing Awaiting sign-off implies the work is done
    const progress = out.status === "AWAITING_SIGNOFF" && out.progress === undefined ? 100 : (out.progress ?? current.progress);
    if (!signOff || progress < 100) out.status = "IN_PROGRESS";
    if (out.status === "AWAITING_SIGNOFF") out.progress = 100;
  }

  if (current.status === "COMPLETED" && (out.status ?? current.status) !== "COMPLETED") {
    out.signedOffAt = null;
    out.signedOffBy = "";
  }
  return out;
}
