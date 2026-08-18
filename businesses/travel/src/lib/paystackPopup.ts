// Paystack inline.js v2 popup helper. The checkout edge function returns
// { url, access_code, reference }; the access_code lets us resume the same
// transaction as an in-page overlay instead of a full-page redirect. The
// popup's onSuccess/onCancel callbacks are best-effort (they don't fire on
// every inline.js version) — callers must verify payment out-of-band by
// polling the reservation lookup, never by trusting the callbacks alone.

const SCRIPT_ID = "paystack-inline-js";
const SCRIPT_SRC = "https://js.paystack.co/v2/inline.js";

let loadPromise: Promise<void> | null = null;

/** Inject inline.js v2 once (guarded against double-inject) and resolve when
 *  window.PaystackPop exists. Rejects after ~6s so callers can fall back. */
export function loadPaystackInline(timeoutMs = 6000): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(new Error("Paystack inline requires a browser"));
  }
  if ((window as any).PaystackPop) return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = new Promise<void>((resolve, reject) => {
    if (!document.getElementById(SCRIPT_ID)) {
      const s = document.createElement("script");
      s.id = SCRIPT_ID;
      s.src = SCRIPT_SRC;
      s.async = true;
      document.head.appendChild(s);
    }
    const startedAt = Date.now();
    const poll = window.setInterval(() => {
      if ((window as any).PaystackPop) {
        window.clearInterval(poll);
        resolve();
      } else if (Date.now() - startedAt > timeoutMs) {
        window.clearInterval(poll);
        loadPromise = null; // allow a retry on the next attempt
        reject(new Error("Paystack inline.js failed to load"));
      }
    }, 100);
  });
  return loadPromise;
}

export type PaystackPopupHandlers = {
  onSuccess?: (transaction?: unknown) => void;
  onCancel?: () => void;
};

/** Open the transaction as an in-page popup. If the script can't load or
 *  PaystackPop throws, falls back to a full-page redirect to fallbackUrl. */
export async function openPaystackPopup(
  accessCode: string,
  fallbackUrl: string,
  handlers: PaystackPopupHandlers = {},
): Promise<void> {
  try {
    await loadPaystackInline();
    const PaystackPop = (window as any).PaystackPop;
    const popup = new PaystackPop();
    popup.resumeTransaction(accessCode, {
      onSuccess: (t: unknown) => handlers.onSuccess?.(t),
      onCancel: () => handlers.onCancel?.(),
    });
  } catch {
    if (fallbackUrl && typeof window !== "undefined") window.location.assign(fallbackUrl);
  }
}
