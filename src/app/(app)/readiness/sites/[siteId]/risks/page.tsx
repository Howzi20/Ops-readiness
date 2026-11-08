import { db } from "@/lib/db";
import { toDateInput } from "@/lib/dates";
import { RiskRegister } from "./RiskRegister";

export const metadata = { title: "Risks" };

export default async function RisksPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const risks = await db.risk.findMany({ where: { siteId }, orderBy: { number: "asc" } });
  return (
    <RiskRegister
      siteId={siteId}
      risks={risks.map((r) => ({ ...r, dateRecorded: toDateInput(r.dateRecorded), targetDate: toDateInput(r.targetDate) }))}
    />
  );
}
