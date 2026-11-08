import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { fmtDate } from "@/lib/dates";
import { AddUserForm, ChangePasswordForm } from "./UserForms";

export const metadata = { title: "Users" };

export default async function UsersPage() {
  const me = await requireUser();
  const users = await db.user.findMany({ orderBy: { name: "asc" } });
  return (
    <>
      <PageHeader title="Users" subtitle="Everyone with a login can see and edit every site." />
      <div className="grid max-w-5xl gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <ul className="divide-y divide-line">
            {users.map((u) => (
              <li key={u.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <div className="font-medium text-ink">{u.name}{u.id === me.id && <span className="ml-2 text-xs text-muted">(you)</span>}</div>
                  <div className="text-muted">{u.email}</div>
                </div>
                <div className="text-xs text-muted">Added {fmtDate(u.createdAt)}</div>
              </li>
            ))}
          </ul>
        </Card>
        <div className="space-y-6">
          <AddUserForm />
          <ChangePasswordForm />
        </div>
      </div>
    </>
  );
}
