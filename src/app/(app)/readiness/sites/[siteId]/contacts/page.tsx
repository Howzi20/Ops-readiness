import { getContacts } from "@/modules/readiness/queries";
import { ContactList } from "./ContactList";

export const metadata = { title: "Contacts" };

export default async function ContactsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const contacts = await getContacts(siteId);
  return <ContactList siteId={siteId} contacts={contacts} />;
}
