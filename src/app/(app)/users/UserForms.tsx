"use client";
import { useActionState, useEffect, useRef } from "react";
import { addUser, changePassword } from "./actions";
import { btn, Card, input } from "@/components/ui";

function useResetOnOk(state: { ok: boolean } | undefined) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return ref;
}

export function AddUserForm() {
  const [state, action, pending] = useActionState(addUser, undefined);
  const ref = useResetOnOk(state);
  return (
    <Card className="p-4">
      <form ref={ref} action={action} className="space-y-2">
        <h2 className="font-semibold text-ink">Add a user</h2>
        <input name="name" placeholder="Full name" className={input} />
        <input name="email" type="email" placeholder="Email" className={input} />
        <input name="password" type="password" placeholder="Temporary password (8+ chars)" className={input} />
        <button className={btn.primary} disabled={pending}>Add user</button>
        {state?.ok && <p className="text-sm text-rag-green">{state.message}</p>}
        {state && !state.ok && <p className="text-sm text-rag-red">{state.error}</p>}
      </form>
    </Card>
  );
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);
  const ref = useResetOnOk(state);
  return (
    <Card className="p-4">
      <form ref={ref} action={action} className="space-y-2">
        <h2 className="font-semibold text-ink">Change my password</h2>
        <input name="current" type="password" placeholder="Current password" className={input} />
        <input name="next" type="password" placeholder="New password (8+ chars)" className={input} />
        <button className={btn.secondary} disabled={pending}>Change password</button>
        {state?.ok && <p className="text-sm text-rag-green">{state.message}</p>}
        {state && !state.ok && <p className="text-sm text-rag-red">{state.error}</p>}
      </form>
    </Card>
  );
}
