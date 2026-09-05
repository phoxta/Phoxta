/**
 * Paystack inline.js v2 popup helper.
 *
 * The checkout function returns { url, access_code, reference }; the access
 * code resumes the same transaction as an in-page overlay instead of a
 * full-page redirect. The popup's callbacks are best-effort, so callers verify
 * payment out-of-band by polling the reservation lookup — never by trusting
 * onSuccess alone.
 */

declare global {
    interface Window {
        PaystackPop?: new () => {
            resumeTransaction: (
                accessCode: string,
                handlers: { onSuccess?: (t?: unknown) => void; onCancel?: () => void },
            ) => void;
        };
    }
}

const SCRIPT_ID = "paystack-inline-js";
const SCRIPT_SRC = "https://js.paystack.co/v2/inline.js";

let loadPromise: Promise<void> | null = null;

/**
 * Inject inline.js v2 once and resolve when window.PaystackPop exists.
 * Rejects after `timeoutMs` so callers can fall back to the hosted page.
 */
export function loadPaystackInline(timeoutMs = 6000): Promise<void> {
    if (typeof window === "undefined" || typeof document === "undefined") {
        return Promise.reject(new Error("Paystack inline requires a browser"));
    }
    if (window.PaystackPop) return Promise.resolve();
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
        let settled = false;
        const poll = window.setInterval(() => {
            if (settled) return;
            if (window.PaystackPop) {
                settled = true;
                window.clearInterval(poll);
                resolve();
            } else if (Date.now() - startedAt > timeoutMs) {
                settled = true;
                window.clearInterval(poll);
                loadPromise = null; // allow a retry on the next attempt
                reject(new Error("Paystack inline.js failed to load"));
            }
        }, 100);
    });
    return loadPromise;
}

export interface PaystackPopupHandlers {
    onSuccess?: (transaction?: unknown) => void;
    onCancel?: () => void;
}

/**
 * Open the transaction as an in-page popup. Falls back to a full-page redirect
 * to `fallbackUrl` when the script cannot load, the access code is missing, or
 * PaystackPop throws.
 */
export async function openPaystackPopup(
    accessCode: string | null | undefined,
    fallbackUrl: string,
    handlers: PaystackPopupHandlers = {},
): Promise<void> {
    try {
        if (!accessCode) throw new Error("no access code");
        await loadPaystackInline();
        const Pop = window.PaystackPop;
        if (!Pop) throw new Error("PaystackPop unavailable");
        new Pop().resumeTransaction(accessCode, {
            onSuccess: (t) => handlers.onSuccess?.(t),
            onCancel: () => handlers.onCancel?.(),
        });
    } catch {
        if (fallbackUrl && typeof window !== "undefined") window.location.assign(fallbackUrl);
    }
}
