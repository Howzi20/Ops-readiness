import { describe, expect, it } from "vitest";
import { applySignOff, completion, computeFlag, daysUntil, normaliseTaskUpdate, workstreamSummary } from "./rules";

const today = new Date("2026-11-07T09:00:00");
const d = (s: string) => new Date(`${s}T00:00:00`);

describe("computeFlag", () => {
  const base = { status: "IN_PROGRESS", progress: 20, targetDate: null, flagOverride: null };

  it("is GREEN with no target date", () => {
    expect(computeFlag(base, today)).toBe("GREEN");
  });
  it("is RED when target date has passed and task is not complete", () => {
    expect(computeFlag({ ...base, targetDate: d("2026-11-06") }, today)).toBe("RED");
  });
  it("is not RED on the target date itself", () => {
    expect(computeFlag({ ...base, progress: 80, targetDate: d("2026-11-07") }, today)).toBe("GREEN");
  });
  it("is GREEN when overdue but Completed or N/A", () => {
    expect(computeFlag({ ...base, status: "COMPLETED", targetDate: d("2026-01-01") }, today)).toBe("GREEN");
    expect(computeFlag({ ...base, status: "NA", targetDate: d("2026-01-01") }, today)).toBe("GREEN");
  });
  it("is YELLOW when due within 14 days and under 50%", () => {
    expect(computeFlag({ ...base, targetDate: d("2026-11-21") }, today)).toBe("YELLOW");
  });
  it("is GREEN when due within 14 days but at 50% or more", () => {
    expect(computeFlag({ ...base, progress: 50, targetDate: d("2026-11-10") }, today)).toBe("GREEN");
  });
  it("is GREEN when due in more than 14 days", () => {
    expect(computeFlag({ ...base, targetDate: d("2026-11-22") }, today)).toBe("GREEN");
  });
  it("respects a manual override", () => {
    expect(computeFlag({ ...base, flagOverride: "RED" }, today)).toBe("RED");
    expect(computeFlag({ ...base, targetDate: d("2026-01-01"), flagOverride: "GREEN" }, today)).toBe("GREEN");
  });
});

describe("completion", () => {
  it("averages progress excluding N/A tasks", () => {
    expect(
      completion([
        { status: "COMPLETED", progress: 100 },
        { status: "IN_PROGRESS", progress: 50 },
        { status: "NA", progress: 0 },
      ]),
    ).toBe(75);
  });
  it("returns null when every task is N/A or there are none", () => {
    expect(completion([])).toBeNull();
    expect(completion([{ status: "NA", progress: 0 }])).toBeNull();
  });
});

describe("workstreamSummary", () => {
  it("counts flags and marks at-risk when any task is red", () => {
    const s = workstreamSummary(
      [
        { status: "IN_PROGRESS", progress: 0, targetDate: d("2026-11-01"), flagOverride: null },
        { status: "IN_PROGRESS", progress: 0, targetDate: d("2026-11-10"), flagOverride: null },
        { status: "COMPLETED", progress: 100, targetDate: null, flagOverride: null },
      ],
      today,
    );
    expect(s).toMatchObject({ red: 1, yellow: 1, total: 3, done: 1, atRisk: true });
    expect(s.completion).toBeCloseTo(33.33, 1);
  });
});

describe("normaliseTaskUpdate", () => {
  it("sets progress to 100 when status becomes Completed", () => {
    expect(normaliseTaskUpdate({ status: "COMPLETED", progress: 40 })).toMatchObject({ progress: 100 });
  });
  it("does not auto-complete when progress hits 100", () => {
    expect(normaliseTaskUpdate({ status: "IN_PROGRESS", progress: 100 })).toMatchObject({ status: "IN_PROGRESS" });
  });
  it("clamps progress to 0..100", () => {
    expect(normaliseTaskUpdate({ progress: 140 }).progress).toBe(100);
    expect(normaliseTaskUpdate({ progress: -5 }).progress).toBe(0);
  });
  it("requires a note for a flag override", () => {
    expect(() => normaliseTaskUpdate({ flagOverride: "RED", overrideNote: " " })).toThrow(/reason/i);
    expect(normaliseTaskUpdate({ flagOverride: "RED", overrideNote: "Supplier risk" }).flagOverride).toBe("RED");
  });
  it("clears the note when the override is removed", () => {
    expect(normaliseTaskUpdate({ flagOverride: null, overrideNote: "old" }).overrideNote).toBe("");
  });
});

describe("daysUntil", () => {
  it("counts whole calendar days", () => {
    expect(daysUntil(d("2026-11-10"), today)).toBe(3);
    expect(daysUntil(d("2026-11-07"), today)).toBe(0);
    expect(daysUntil(d("2026-11-01"), today)).toBe(-6);
    expect(daysUntil(null, today)).toBeNull();
  });
});

describe("applySignOff", () => {
  const cur = { status: "IN_PROGRESS", progress: 60, signOffId: "so1" };

  it("routes Completed to Awaiting sign-off when a sign-off person is set", () => {
    expect(applySignOff({ status: "COMPLETED" }, cur)).toMatchObject({ status: "AWAITING_SIGNOFF", progress: 100 });
  });
  it("routes progress 100 to Awaiting sign-off when a sign-off person is set", () => {
    expect(applySignOff({ progress: 100 }, cur)).toMatchObject({ status: "AWAITING_SIGNOFF", progress: 100 });
  });
  it("completes directly when there is no sign-off person", () => {
    expect(applySignOff({ status: "COMPLETED" }, { ...cur, signOffId: null })).toMatchObject({ status: "COMPLETED" });
    expect(applySignOff({ progress: 100 }, { ...cur, signOffId: null }).status).toBeUndefined();
  });
  it("uses a sign-off person set in the same edit", () => {
    expect(applySignOff({ status: "COMPLETED", signOffId: "x" }, { ...cur, signOffId: null })).toMatchObject({ status: "AWAITING_SIGNOFF" });
  });
  it("refuses Awaiting sign-off without a sign-off person", () => {
    expect(() => applySignOff({ status: "AWAITING_SIGNOFF" }, { ...cur, signOffId: null })).toThrow(/sign-off person/i);
  });
  it("sends an awaiting task back to In Progress when progress drops or the sign-off person is removed", () => {
    const waiting = { status: "AWAITING_SIGNOFF", progress: 100, signOffId: "so1" };
    expect(applySignOff({ progress: 80 }, waiting)).toMatchObject({ status: "IN_PROGRESS" });
    expect(applySignOff({ signOffId: null }, waiting)).toMatchObject({ status: "IN_PROGRESS" });
  });
  it("clears the sign-off record when a completed task is reopened", () => {
    const done = { status: "COMPLETED", progress: 100, signOffId: "so1" };
    expect(applySignOff({ status: "IN_PROGRESS" }, done)).toMatchObject({ signedOffAt: null, signedOffBy: "" });
  });
  it("leaves unrelated edits alone", () => {
    expect(applySignOff({ priority: 1 } as never, cur)).toEqual({ priority: 1 });
  });
});
