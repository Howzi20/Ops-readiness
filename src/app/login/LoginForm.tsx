"use client";
import { useActionState } from "react";
import { loginAction } from "./actions";
import { btn, input, label } from "@/components/ui";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="text-2xl font-semibold tracking-tight text-white">Operations Readiness</div>
          <div className="mt-1 text-sm text-white/60">Construction to Go-Live tracker</div>
        </div>
        <form action={action} className="space-y-4 rounded-lg bg-white p-6 shadow-xl">
          <div>
            <label className={label} htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required autoComplete="username" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required autoComplete="current-password" className={input} />
          </div>
          {state?.error && <p className="text-sm text-rag-red">{state.error}</p>}
          <button type="submit" disabled={pending} className={btn.primary + " w-full justify-center"}>
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
