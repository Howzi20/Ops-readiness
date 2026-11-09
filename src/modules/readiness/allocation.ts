import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = PrismaClient | Prisma.TransactionClient;
const OPEN = { notIn: ["COMPLETED", "NA"] };

/**
 * Copy a workstream's Owner and/or Approver onto its open tasks (Completed and N/A keep
 * their history). Returns tasks awaiting approval whose approver changed, so the caller
 * can email the new approver.
 */
export async function applyWorkstreamPeople(db: Tx, workstreamId: string, people: { ownerId?: string | null; approverId?: string | null }) {
  const newlyAwaitingApprover: string[] = [];
  if (people.ownerId !== undefined) {
    await db.task.updateMany({ where: { workstreamId, status: OPEN }, data: { ownerId: people.ownerId } });
  }
  if (people.approverId !== undefined) {
    if (people.approverId) {
      const waiting = await db.task.findMany({
        where: { workstreamId, status: "AWAITING_SIGNOFF", NOT: { signOffId: people.approverId } },
        select: { id: true },
      });
      newlyAwaitingApprover.push(...waiting.map((t) => t.id));
    } else {
      // no approver any more: nothing can approve tasks that were waiting
      await db.task.updateMany({ where: { workstreamId, status: "AWAITING_SIGNOFF" }, data: { status: "IN_PROGRESS", progress: 90 } });
    }
    await db.task.updateMany({ where: { workstreamId, status: OPEN }, data: { signOffId: people.approverId } });
  }
  return { newlyAwaitingApprover };
}
