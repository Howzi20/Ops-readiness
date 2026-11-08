import { getSite } from "@/modules/readiness/queries";
import { toDateInput } from "@/lib/dates";
import { SiteSettings } from "./SiteSettings";

export const metadata = { title: "Site settings" };

export default async function SettingsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const s = await getSite(siteId);
  return (
    <SiteSettings
      site={{
        id: s.id,
        name: s.name,
        client: s.client,
        address: s.address,
        template: s.template?.name ?? null,
        transitionStart: toDateInput(s.transitionStart),
        pcDate: toDateInput(s.pcDate),
        goLiveDate: toDateInput(s.goLiveDate),
      }}
    />
  );
}
