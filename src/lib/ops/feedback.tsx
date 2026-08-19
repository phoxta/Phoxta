// Phoxta ops console — shared feedback primitives. Every console mutation
// should surface its outcome through these instead of fire-and-forget writes:
//   toast("Saved");  toastError("Could not save — try again.");
//   if (!confirmDanger("Delete this contact?")) return;
// <OpsToasts /> is mounted once in OperatingLayout.
import { useEffect, useState } from "react";

export type OpsToast = { id: number; kind: "success" | "error" | "info"; text: string };

let nextId = 1;
const listeners = new Set<(t: OpsToast) => void>();

export function toast(text: string, kind: OpsToast["kind"] = "success") {
  const t: OpsToast = { id: nextId++, kind, text };
  listeners.forEach((l) => l(t));
}

export function toastError(text: string) {
  toast(text, "error");
}

/** Confirm an irreversible action. Central so the affordance can be upgraded once. */
export function confirmDanger(message: string): boolean {
  return window.confirm(message);
}

/**
 * Await a supabase-style mutation and surface the outcome. Returns true on
 * success. Accepts either {error: string|null} or {error: {message}|null}.
 */
export async function reportMutation(
  // PromiseLike, not Promise: Supabase query builders are thenables.
  p: PromiseLike<{ error?: string | { message?: string } | null } | void | null>,
  okMsg?: string,
  failMsg = "That didn't save — check your connection and try again.",
): Promise<boolean> {
  try {
    const res = await p;
    const err = res && typeof res === "object" && "error" in res ? res.error : null;
    if (err) {
      toastError(typeof err === "string" ? err : err.message || failMsg);
      return false;
    }
    if (okMsg) toast(okMsg);
    return true;
  } catch (e) {
    toastError((e as Error)?.message || failMsg);
    return false;
  }
}

const KIND_CLASS: Record<OpsToast["kind"], string> = {
  success: "bg-dark text-white",
  error: "bg-danger text-white",
  info: "bg-secondary text-white",
};

export function OpsToasts() {
  const [items, setItems] = useState<OpsToast[]>([]);
  useEffect(() => {
    const on = (t: OpsToast) => {
      setItems((xs) => [...xs, t]);
      window.setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== t.id)), t.kind === "error" ? 6000 : 3500);
    };
    listeners.add(on);
    return () => {
      listeners.delete(on);
    };
  }, []);
  if (items.length === 0) return null;
  return (
    <div style={{ position: "fixed", right: 16, bottom: 16, zIndex: 2000, display: "flex", flexDirection: "column", gap: 8, maxWidth: 360 }} aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`rounded-3 px-3 py-2 shadow fz-font-md ${KIND_CLASS[t.kind]}`}>{t.text}</div>
      ))}
    </div>
  );
}
