import { useEffect, useState } from "react";

/**
 * Wàfè, offline.
 *
 * Home is the screen a family opens when they have no signal — on the train,
 * in a Lagos car park, in the church hall — so Home is the module that owns
 * the offline shell. It registers `public/wafe-sw.js` (which must be served
 * from the origin root to hold the whole app in scope) and links the web app
 * manifest, both once, at boot.
 *
 * Nothing here can break the app: every step is wrapped, a browser without
 * service workers simply carries on, and the worker itself never caches the
 * API — only the shell, which is the part that cannot be rebuilt from
 * localStorage.
 */

const SW_URL = "/wafe-sw.js";
const MANIFEST_URL = "/wafe.webmanifest";

let started = false;

/** Link the manifest from the head if index.html has not already. */
function linkManifest(): void {
    if (typeof document === "undefined") return;
    if (document.querySelector('link[rel="manifest"]')) return;
    const link = document.createElement("link");
    link.rel = "manifest";
    link.href = MANIFEST_URL;
    document.head.appendChild(link);
}

/**
 * Register the offline shell. Safe to call more than once; the second call
 * does nothing.
 */
export function registerOfflineShell(): void {
    if (started || typeof window === "undefined") return;
    started = true;

    try {
        linkManifest();
    } catch {
        /* a locked-down document is not a reason to fail */
    }

    if (!("serviceWorker" in navigator)) return;
    const register = (): void => {
        navigator.serviceWorker.register(SW_URL, { scope: "/" }).catch((e: unknown) => {
            // A file:// origin, a private window, a browser with workers off:
            // the app works, it simply will not work offline.
            console.warn("[wafe] offline shell unavailable:", e instanceof Error ? e.message : e);
        });
    };

    // After load, so caching the shell never competes with painting it.
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
}

/** Whether the browser currently believes it has a connection. */
export function useOnline(): boolean {
    const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine !== false));
    useEffect(() => {
        const up = () => setOnline(true);
        const down = () => setOnline(false);
        window.addEventListener("online", up);
        window.addEventListener("offline", down);
        return () => {
            window.removeEventListener("online", up);
            window.removeEventListener("offline", down);
        };
    }, []);
    return online;
}
