// Paystack inline.js v2 popup helper for the Gearo storefront.
// Loads Paystack's inline script once and opens an already-created transaction
// (by access_code) as an in-page overlay, so the shopper never leaves the site.
// If the script can't load or the popup throws, we fall back to a full-page
// redirect to the hosted checkout URL — payment always has a path.

type PaystackHandlers = {
    onSuccess?: (transaction?: unknown) => void;
    onCancel?: () => void;
};
type PaystackPopInstance = {
    resumeTransaction: (accessCode: string, handlers?: PaystackHandlers) => void;
};

declare global {
    interface Window {
        PaystackPop?: new () => PaystackPopInstance;
    }
}

const INLINE_SRC = "https://js.paystack.co/v2/inline.js";
const LOAD_TIMEOUT_MS = 6000;

let loading: Promise<void> | null = null;

/** Inject inline.js v2 exactly once (guards against double-inject) and resolve
 *  when `window.PaystackPop` exists. Rejects after ~6s if it never appears,
 *  clearing the cached promise so a later call can retry. */
export function loadPaystackInline(): Promise<void> {
    if (typeof window !== "undefined" && window.PaystackPop) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise<void>((resolve, reject) => {
        if (typeof document === "undefined") { reject(new Error("Paystack inline needs a browser")); return; }
        if (!document.querySelector(`script[src="${INLINE_SRC}"]`)) {
            const s = document.createElement("script");
            s.src = INLINE_SRC;
            s.async = true;
            document.head.appendChild(s);
        }
        const started = Date.now();
        const tick = () => {
            if (window.PaystackPop) { resolve(); return; }
            if (Date.now() - started >= LOAD_TIMEOUT_MS) {
                loading = null; // allow retry on a later call
                reject(new Error("Paystack inline.js failed to load"));
                return;
            }
            window.setTimeout(tick, 100);
        };
        tick();
    });
    return loading;
}

/** Open the Paystack overlay for a created transaction. Falls back to a
 *  full-page redirect to `fallbackUrl` when the popup can't open at all.
 *  NOTE: the inline callbacks don't fire on every inline.js version — callers
 *  must ALSO verify payment out-of-band (e.g. polling the guest order lookup). */
export async function openPaystackPopup(
    accessCode: string,
    fallbackUrl: string,
    handlers: PaystackHandlers = {},
): Promise<void> {
    try {
        await loadPaystackInline();
        const Pop = window.PaystackPop;
        if (!Pop) throw new Error("PaystackPop unavailable");
        new Pop().resumeTransaction(accessCode, {
            onSuccess: (t?: unknown) => handlers.onSuccess?.(t),
            onCancel: () => handlers.onCancel?.(),
        });
    } catch {
        if (fallbackUrl) window.location.assign(fallbackUrl);
    }
}
