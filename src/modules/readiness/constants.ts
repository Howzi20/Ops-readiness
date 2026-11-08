export const STATUSES = ["TO_COMMENCE", "IN_PROGRESS", "DELAYED", "AWAITING_SIGNOFF", "COMPLETED", "NA"] as const;
export type Status = (typeof STATUSES)[number];
export const STATUS_LABEL: Record<Status, string> = {
  TO_COMMENCE: "To Commence",
  IN_PROGRESS: "In Progress",
  DELAYED: "Delayed",
  AWAITING_SIGNOFF: "Awaiting approval",
  COMPLETED: "Completed",
  NA: "N/A",
};

/** Cell fill + text colour per status. Always shown with the label, never colour alone. */
export const STATUS_COLOR: Record<Status, { bg: string; fg: string }> = {
  TO_COMMENCE: { bg: "#7c8a9e", fg: "#ffffff" },
  IN_PROGRESS: { bg: "#f0a32a", fg: "#1f2a37" },
  DELAYED: { bg: "#d9434f", fg: "#ffffff" },
  AWAITING_SIGNOFF: { bg: "#7b5cc4", fg: "#ffffff" },
  COMPLETED: { bg: "#1f8f7a", fg: "#ffffff" },
  NA: { bg: "#d5dae2", fg: "#3c4b5c" },
};

export const PRIORITY_COLOR: Record<number, { bg: string; fg: string; label: string }> = {
  1: { bg: "#3b3f8f", fg: "#ffffff", label: "1 · Key" },
  2: { bg: "#6c72c9", fg: "#ffffff", label: "2 · Standard" },
  3: { bg: "#b7bbe8", fg: "#1f2a37", label: "3 · Not critical" },
};

/** Colours for section groups (cycled by group position — groups are labelled, so colour is decoration). */
export const GROUP_COLORS = ["#0e7c86", "#6c72c9", "#e07a2e", "#2f8fd1", "#b5517d", "#4f9a3a", "#8a6dc7", "#c98a12"];

export const FLAGS = ["RED", "YELLOW", "GREEN"] as const;
export type Flag = (typeof FLAGS)[number];

export const PHASES = ["PRE_PC", "POST_PC"] as const;
export type Phase = (typeof PHASES)[number];
export const PHASE_LABEL: Record<Phase, string> = { PRE_PC: "Pre-PC", POST_PC: "Post-PC" };

export const DOCUMENTED = ["YES", "NO", "NA"] as const;
export const DOCUMENTED_LABEL: Record<(typeof DOCUMENTED)[number], string> = { YES: "Yes", NO: "No", NA: "N/A" };

export const ORGANISATIONS = ["TEAM", "CLIENT", "OTHER"] as const;
export const ORG_LABEL: Record<(typeof ORGANISATIONS)[number], string> = {
  TEAM: "Our team",
  CLIENT: "Client",
  OTHER: "Other",
};

export const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
export const RISK_STATUSES = ["OPEN", "CLOSED"] as const;

/** Tasks due within this many days and under YELLOW_PROGRESS_BELOW % are flagged yellow. */
export const YELLOW_WINDOW_DAYS = 14;
export const YELLOW_PROGRESS_BELOW = 50;
