import { lazy, Suspense, useState } from "react";

// Floating "talk to the agent" launcher for the public site. Renders a fixed mic
// button (bottom-left, clear of BackToTop on the right); clicking opens a small
// panel with the live WebRTC voice widget — the same agent brain that answers the
// phone. Stays inert (renders nothing) until both env vars are configured.
const VoiceAgentWidget = lazy(() => import("@/shared/VoiceAgentWidget"));

const SERVER_URL = (import.meta.env.VITE_VOICE_SERVER_URL as string | undefined) ?? "";
const PUBLIC_KEY = (import.meta.env.VITE_AGENT_PUBLIC_KEY as string | undefined) ?? "";

export default function FloatingVoiceWidget() {
    const [open, setOpen] = useState(false);

    if (!SERVER_URL || !PUBLIC_KEY) return null;

    return (
        <div style={{ position: "fixed", left: 30, bottom: 30, zIndex: 1035 }}>
            {open && (
                <div
                    className="bg-neutral-0 rounded-4 border-100 shadow-lg mb-3 p-2"
                    style={{ width: 300, position: "absolute", bottom: 72, left: 0 }}
                    role="dialog"
                    aria-label="Talk to the Phoxta agent"
                >
                    <div className="d-flex justify-content-end">
                        <button type="button" className="btn btn-link btn-sm p-1 neutral-500 text-decoration-none" onClick={() => setOpen(false)} aria-label="Close voice chat">
                            ✕
                        </button>
                    </div>
                    <Suspense fallback={<div className="p-4 text-center neutral-500 fz-font-md">Loading voice…</div>}>
                        <VoiceAgentWidget publicKey={PUBLIC_KEY} serverUrl={SERVER_URL} />
                    </Suspense>
                </div>
            )}

            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-label={open ? "Close voice chat" : "Talk to the agent"}
                aria-expanded={open}
                className="btn btn-dark rounded-circle d-inline-flex align-items-center justify-content-center shadow"
                style={{ width: 56, height: 56 }}
            >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
            </button>
        </div>
    );
}
