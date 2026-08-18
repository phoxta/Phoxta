// Paystack inline.js v2 popup helper — opens the platform-created transaction
// (paystack-storefront-checkout returns { url, access_code, reference }) as an
// in-page overlay instead of a full-page redirect. If the script can't load or
// the popup throws, we fall back to the hosted payment URL so the customer can
// always pay. NOTE: the popup's onSuccess/onCancel callbacks may not fire on
// every inline.js build — callers must ALSO verify payment server-side (the
// tracking page polls the guest order lookup).

type PaystackTransaction = { reference?: string; status?: string };
export type PaystackHandlers = {
  onSuccess?: (t?: PaystackTransaction) => void;
  onCancel?: () => void;
};
type PaystackPopInstance = {
  resumeTransaction: (accessCode: string, handlers?: PaystackHandlers) => void;
};
declare global {
  interface Window { PaystackPop?: new () => PaystackPopInstance }
}

const SCRIPT_ID = "paystack-inline-v2";
const SCRIPT_SRC = "https://js.paystack.co/v2/inline.js";
const LOAD_TIMEOUT_MS = 6000;

let loadPromise: Promise<void> | null = null;

/** Inject Paystack inline.js v2 once (double-inject guarded); resolves when
 *  window.PaystackPop exists, rejects after ~6s so callers can fall back. */
export function loadPaystackInline(): Promise<void> {
  if (typeof window !== "undefined" && window.PaystackPop) return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = new Promise<void>((resolve, reject) => {
    if (typeof document === "undefined") { reject(new Error("no document")); return; }
    let settled = false;
    const finish = (ok: boolean, err?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearInterval(poll);
      if (ok) resolve();
      else { loadPromise = null; reject(err ?? new Error("Paystack inline.js failed to load")); }
    };
    // Some versions attach PaystackPop a tick after onload — poll cheaply too.
    const poll = setInterval(() => { if (window.PaystackPop) finish(true); }, 150);
    const timer = setTimeout(() => finish(false, new Error("Paystack inline.js load timed out")), LOAD_TIMEOUT_MS);
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) return; // already injected — the poll/timeout above settle us
    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => { if (window.PaystackPop) finish(true); };
    s.onerror = () => finish(false, new Error("Paystack inline.js failed to load"));
    document.head.appendChild(s);
  });
  return loadPromise;
}

/** Open the Paystack overlay for a transaction access_code. Falls back to a
 *  full-page redirect to `fallbackUrl` when the popup isn't possible. The
 *  handlers are best-effort only — verify payment via the order lookup. */
export async function openPaystackPopup(
  accessCode: string | null | undefined,
  fallbackUrl: string,
  handlers: PaystackHandlers = {},
): Promise<void> {
  const fallback = () => { if (fallbackUrl) window.location.assign(fallbackUrl); };
  if (!accessCode) { fallback(); return; }
  try {
    await loadPaystackInline();
    const Pop = window.PaystackPop;
    if (!Pop) throw new Error("PaystackPop unavailable");
    const popup = new Pop();
    popup.resumeTransaction(accessCode, {
      onSuccess: (t?: PaystackTransaction) => handlers.onSuccess?.(t),
      onCancel: () => handlers.onCancel?.(),
    });
  } catch {
    fallback();
  }
}
