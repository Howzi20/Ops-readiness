"use client";
import { useActionState, useEffect, useState } from "react";
import { deleteContact, saveContact } from "@/modules/readiness/actions";
import { ORGANISATIONS, ORG_LABEL } from "@/modules/readiness/constants";
import { btn, Card, Empty, input, label } from "@/components/ui";

type Contact = { id: string; name: string; organisation: string; role: string; initials: string; phone: string; email: string; leaveNotes: string };

export function ContactList({ siteId, contacts }: { siteId: string; contacts: Contact[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const current = editing && editing !== "new" ? contacts.find((c) => c.id === editing) ?? null : null;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">People on this site. Assign them as task Owner, Approver or Collaborator. Contacts don't need a login.</p>
        <button className={btn.primary} onClick={() => setEditing("new")}>+ Add contact</button>
      </div>
      {contacts.length === 0 && <Empty>No contacts yet.</Empty>}
      {ORGANISATIONS.map((org) => {
        const list = contacts.filter((c) => c.organisation === org);
        if (!list.length) return null;
        return (
          <section key={org}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">{ORG_LABEL[org]}</h2>
            <Card className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm">
                <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="w-16 px-4 py-2.5 font-medium">Initials</th>
                    <th className="px-4 py-2.5 font-medium">Name</th>
                    <th className="px-4 py-2.5 font-medium">Role</th>
                    <th className="px-4 py-2.5 font-medium">Phone</th>
                    <th className="px-4 py-2.5 font-medium">Email</th>
                    <th className="px-4 py-2.5 font-medium">Leave</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.map((c) => (
                    <tr key={c.id} className="cursor-pointer hover:bg-canvas/60" onClick={() => setEditing(c.id)}>
                      <td className="px-4 py-2.5"><span className="rounded bg-accent-soft px-1.5 py-0.5 text-xs font-semibold text-accent-strong">{c.initials}</span></td>
                      <td className="px-4 py-2.5 font-medium text-ink">{c.name}</td>
                      <td className="px-4 py-2.5">{c.role}</td>
                      <td className="px-4 py-2.5 tabular">{c.phone}</td>
                      <td className="px-4 py-2.5">{c.email}</td>
                      <td className="px-4 py-2.5 text-muted">{c.leaveNotes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </section>
        );
      })}
      {editing && <ContactForm key={editing} siteId={siteId} contact={current} onClose={() => setEditing(null)} />}
    </div>
  );
}

function ContactForm({ siteId, contact, onClose }: { siteId: string; contact: Contact | null; onClose: () => void }) {
  const [state, action, pending] = useActionState(saveContact.bind(null, siteId, contact?.id ?? null), undefined);
  useEffect(() => { if (state?.ok) onClose(); }, [state, onClose]);
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink/20" onClick={onClose}>
      <aside className="h-full w-full max-w-md overflow-y-auto bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <form action={action} className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink">{contact ? "Edit contact" : "New contact"}</h2>
            <button type="button" className={btn.ghost} onClick={onClose}>✕</button>
          </div>
          <div className="grid grid-cols-[1fr_6rem] gap-3">
            <div><label className={label}>Name *</label><input name="name" required defaultValue={contact?.name} className={input} /></div>
            <div><label className={label}>Initials *</label><input name="initials" required maxLength={6} defaultValue={contact?.initials} className={input + " uppercase"} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Organisation</label>
              <select name="organisation" defaultValue={contact?.organisation ?? "TEAM"} className={input}>
                {ORGANISATIONS.map((o) => <option key={o} value={o}>{ORG_LABEL[o]}</option>)}
              </select>
            </div>
            <div><label className={label}>Role / title</label><input name="role" defaultValue={contact?.role} className={input} /></div>
            <div><label className={label}>Phone</label><input name="phone" defaultValue={contact?.phone} className={input} /></div>
            <div><label className={label}>Email</label><input name="email" type="email" defaultValue={contact?.email} className={input} /></div>
          </div>
          <div><label className={label}>Annual leave</label><input name="leaveNotes" defaultValue={contact?.leaveNotes} className={input} placeholder="e.g. 12–23 Jan" /></div>
          {state && !state.ok && <p className="text-sm text-rag-red">{state.error}</p>}
          <div className="flex items-center gap-2">
            <button className={btn.primary} disabled={pending}>{pending ? "Saving…" : "Save contact"}</button>
            {contact && (
              <button
                type="button"
                className={btn.danger + " ml-auto"}
                onClick={async () => {
                  if (confirm(`Remove ${contact.name}? They will be unassigned from any tasks.`)) {
                    await deleteContact(siteId, contact.id);
                    onClose();
                  }
                }}
              >
                Remove
              </button>
            )}
          </div>
        </form>
      </aside>
    </div>
  );
}
