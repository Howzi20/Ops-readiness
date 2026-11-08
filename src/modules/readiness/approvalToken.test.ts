import { beforeAll, describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { signApprovalToken, verifyApprovalToken } from "./approvalToken";

beforeAll(() => {
  process.env.SESSION_SECRET = "unit-test-secret-0123456789abcdef";
});

describe("approval link tokens", () => {
  it("round-trips the task and approver", async () => {
    const token = await signApprovalToken({ taskId: "t1", approverId: "c1" });
    expect(await verifyApprovalToken(token)).toEqual({ taskId: "t1", approverId: "c1" });
  });
  it("rejects tampered and foreign tokens", async () => {
    const token = await signApprovalToken({ taskId: "t1", approverId: "c1" });
    expect(await verifyApprovalToken(token.slice(0, -2) + "xx")).toBeNull();
    const other = await new SignJWT({ t: "t1", a: "c1", purpose: "approve" })
      .setProtectedHeader({ alg: "HS256" })
      .sign(new TextEncoder().encode("a-different-secret-0123456789"));
    expect(await verifyApprovalToken(other)).toBeNull();
  });
  it("rejects a login session token used as an approval link", async () => {
    const session = await new SignJWT({ userId: "u1", name: "x" })
      .setProtectedHeader({ alg: "HS256" })
      .sign(new TextEncoder().encode(process.env.SESSION_SECRET!));
    expect(await verifyApprovalToken(session)).toBeNull();
  });
  it("rejects expired tokens", async () => {
    const expired = await new SignJWT({ t: "t1", a: "c1", purpose: "approve" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(new TextEncoder().encode(process.env.SESSION_SECRET!));
    expect(await verifyApprovalToken(expired)).toBeNull();
  });
});
