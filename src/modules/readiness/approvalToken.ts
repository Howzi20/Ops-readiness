import { SignJWT, jwtVerify } from "jose";

/** Signed, expiring link token that lets one approver act on one task without logging in. */
export type ApprovalClaim = { taskId: string; approverId: string };

const VALID_DAYS = 30;

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) throw new Error("SESSION_SECRET must be set (16+ chars)");
  return new TextEncoder().encode(secret);
}

export async function signApprovalToken(claim: ApprovalClaim) {
  return new SignJWT({ t: claim.taskId, a: claim.approverId, purpose: "approve" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${VALID_DAYS}d`)
    .sign(key());
}

export async function verifyApprovalToken(token: string): Promise<ApprovalClaim | null> {
  try {
    const { payload } = await jwtVerify(token, key());
    if (payload.purpose !== "approve" || typeof payload.t !== "string" || typeof payload.a !== "string") return null;
    return { taskId: payload.t, approverId: payload.a };
  } catch {
    return null;
  }
}
