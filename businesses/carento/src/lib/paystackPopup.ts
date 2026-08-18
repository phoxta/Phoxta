// Paystack inline.js v2 loader + popup opener for the carento storefront.
// loadPaystackInline injects the script tag once (guarded against double
// injection) and resolves when window.PaystackPop exists; openPaystackPopup
// opens the transaction as an in-page overlay and falls back to a full-page
// redirect when the script can't load or throws (adblock, offline, CSP).
// NOTE: the popup's onSuccess/onCancel callbacks are best-effort — payment
// truth comes from polling the reservation lookup, not from these callbacks.

export type PaystackCallbacks = {
  onSuccess?: (transaction?: unknown) => void;
  onCancel?: () => void;
};

type PaystackPopInstance = {
  resumeTransaction: (accessCode: string, callbacks?: PaystackCallbacks) => void;
};

declare global {
  interface Window {
    PaystackPop?: new () => PaystackPopInstance;
  }
}

const INLINE_SRC = "https://js.paystack.co/v2/inline.js";
let pending: Promise<void> | null = null;

/** Inject Paystack inline.js v2 once; resolves when window.PaystackPop exists,
 *  rejects after ~6s (or on script error) so callers can fall back to redirect. */
export function loadPaystackInline(timeoutMs = 6000): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(new Error("Paystack inline requires a browser"));
  }
  if (window.PaystackPop) return Promise.resolve();
  if (pending) return pending;
  pending = new Promise<void>((resolve, reject) => {
    let settled = false;
    let timer = 0;
    let poll = 0;
    const done = (err?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.clearInterval(poll);
      if (err) {
        pending = null; // allow a retry on the next attempt
        reject(err);
      } else {
        resolve();
      }
    };
    let script = document.querySelector<HTMLScriptElement>(`script[src="${INLINE_SRC}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = INLINE_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener("error", () => done(new Error("Paystack inline.js failed to load")));
    poll = window.setInterval(() => {
      if (window.PaystackPop) done();
    }, 100);
    timer = window.setTimeout(() => done(new Error("Paystack inline.js timed out")), timeoutMs);
  });
  return pending;
}

/** Open the Paystack overlay for an access code. If the inline script can't
 *  load or PaystackPop throws, falls back to a full-page redirect to
 *  fallbackUrl (the hosted checkout page). */
export async function openPaystackPopup(
  accessCode: string | null | undefined,
  fallbackUrl: string | null | undefined,
  handlers?: PaystackCallbacks,
): Promise<void> {
  try {
    if (!accessCode) throw new Error("Missing Paystack access code");
    await loadPaystackInline();
    const Pop = window.PaystackPop;
    if (!Pop) throw new Error("PaystackPop unavailable");
    new Pop().resumeTransaction(accessCode, {
      onSuccess: (t?: unknown) => handlers?.onSuccess?.(t),
      onCancel: () => handlers?.onCancel?.(),
    });
  } catch {
    if (fallbackUrl) window.location.assign(fallbackUrl);
  }
}
