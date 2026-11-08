import { getAllocation, getContacts } from "@/modules/readiness/queries";
import { ContactList } from "./ContactList";

export const metadata = { title: "Contacts" };

export default async function ContactsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const [contacts, allocation] = await Promise.all([getContacts(siteId), getAllocation(siteId)]);
  return <ContactList siteId={siteId} contacts={contacts} allocation={allocation} />;
}
