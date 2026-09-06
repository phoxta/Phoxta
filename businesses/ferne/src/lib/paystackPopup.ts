// Paystack inline.js v2 popup helper.
// Loads the official script once and opens a checkout transaction as an in-page
// overlay (resumeTransaction with the access_code from paystack-storefront-checkout).
// If the script can't load or the popup throws, we fall back to a full-page
// redirect to the hosted payment url so the buyer can always pay.

const INLINE_SRC = "https://js.paystack.co/v2/inline.js";
const LOAD_TIMEOUT_MS = 6000;

export type PaystackTransaction = { reference?: string } & Record<string, unknown>;
export type PaystackPopupHandlers = {
  onSuccess?: (transaction: PaystackTransaction) => void;
  onCancel?: () => void;
};

type PaystackPopInstance = {
  resumeTransaction: (accessCode: string, callbacks?: PaystackPopupHandlers) => unknown;
};

declare global {
  interface Window {
    PaystackPop?: new () => PaystackPopInstance;
  }
}

let pendingLoad: Promise<void> | null = null;

/** Inject inline.js v2 once (guarded against double-inject) and resolve when
 *  window.PaystackPop exists. Rejects after ~6s so callers can fall back. */
export function loadPaystackInline(): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(new Error("Paystack inline.js needs a browser"));
  }
  if (window.PaystackPop) return Promise.resolve();
  if (pendingLoad) return pendingLoad;

  pendingLoad = new Promise<void>((resolve, reject) => {
    let settled = false;
    const settle = (err?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      if (err) {
        pendingLoad = null; // allow a retry on the next attempt
        reject(err);
      } else {
        resolve();
      }
    };
    const timer = window.setTimeout(
      () => settle(new Error("Timed out loading Paystack inline.js")),
      LOAD_TIMEOUT_MS,
    );

    let script = document.querySelector<HTMLScriptElement>(`script[src="${INLINE_SRC}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = INLINE_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", () => {
      if (window.PaystackPop) settle();
      else settle(new Error("Paystack inline.js loaded but PaystackPop is missing"));
    });
    script.addEventListener("error", () => settle(new Error("Failed to load Paystack inline.js")));
    // Script tag already present and executed before we attached listeners.
    if (window.PaystackPop) settle();
  });
  return pendingLoad;
}

/** Open the Paystack overlay popup for an access_code. The onSuccess/onCancel
 *  callbacks are best-effort (they may not fire on every inline.js version —
 *  callers must verify payment server-side, e.g. by polling the order lookup).
 *  Falls back to a full-page redirect to fallbackUrl if the popup can't open. */
export async function openPaystackPopup(
  accessCode: string,
  fallbackUrl: string,
  handlers?: PaystackPopupHandlers,
): Promise<void> {
  try {
    await loadPaystackInline();
    const Pop = window.PaystackPop;
    if (!Pop) throw new Error("PaystackPop unavailable");
    const popup = new Pop();
    popup.resumeTransaction(accessCode, {
      onSuccess: (transaction: PaystackTransaction) => handlers?.onSuccess?.(transaction),
      onCancel: () => handlers?.onCancel?.(),
    });
  } catch {
    if (fallbackUrl) window.location.assign(fallbackUrl);
  }
}
