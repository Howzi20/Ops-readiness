"use client";
import { useActionState, useState } from "react";
import { approveViaLink, returnViaLink } from "./actions";
import { btn, input } from "@/components/ui";

export function ApprovalForm({ token }: { token: string }) {
  const [approved, approve, approving] = useActionState(approveViaLink.bind(null, token), undefined);
  const [returned, sendBack, returning] = useActionState(returnViaLink.bind(null, token), undefined);
  const [showReturn, setShowReturn] = useState(false);
  const done = approved?.ok ? approved : returned?.ok ? returned : null;
  if (done) return <p className="text-sm font-medium text-ink">{done.message}</p>;
  const error = (approved && !approved.ok && approved.message) || (returned && !returned.ok && returned.message);
  return (
    <div className="space-y-3">
      {!showReturn ? (
        <div className="flex gap-2">
          <form action={approve}>
            <button className="rounded-md px-4 py-2 text-sm font-medium text-white hover:brightness-95 disabled:opacity-50" style={{ background: "#1f8f7a" }} disabled={approving}>
              {approving ? "Approving…" : "Approve"}
            </button>
          </form>
          <button className={btn.secondary} onClick={() => setShowReturn(true)}>Return for more work</button>
        </div>
      ) : (
        <form action={sendBack} className="space-y-2">
          <textarea name="reason" required rows={3} className={input} placeholder="What still needs doing? (required)" autoFocus />
          <div className="flex gap-2">
            <button className={btn.primary} disabled={returning}>{returning ? "Sending…" : "Send back to owner"}</button>
            <button type="button" className={btn.ghost} onClick={() => setShowReturn(false)}>Cancel</button>
          </div>
        </form>
      )}
      {error && <p className="text-sm text-rag-red">{error}</p>}
    </div>
  );
}
