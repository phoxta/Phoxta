import { type ComponentProps, useEffect, useRef, useState } from "react";
import { PipecatClient } from "@pipecat-ai/client-js";
import { SmallWebRTCTransport } from "@pipecat-ai/small-webrtc-transport";
import {
    PipecatClientAudio,
    PipecatClientProvider,
    usePipecatClient,
    usePipecatClientTransportState,
} from "@pipecat-ai/client-react";

// In-browser voice channel for the Phoxta agent. The browser opens a WebRTC peer
// connection to the self-hosted Pipecat voice server (POST <serverUrl>/offer),
// which runs the SAME agent brain (agent-inbound) that powers phone, SMS and chat
// — so a visitor can simply talk to the agent on the page. Mic only, no camera.

type Props = {
    /** The business agent public key (AI Agent → Configure → web key). */
    publicKey: string;
    /** Base URL of the Pipecat voice server, e.g. https://phoxta-voice.fly.dev. */
    serverUrl: string;
};

const MIC_ICON = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
);

const STOP_ICON = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
);

// Map the transport state machine to a friendly, customer-facing label.
const STATUS: Record<string, string> = {
    disconnected: "Tap to talk to the agent",
    initializing: "Starting microphone…",
    initialized: "Ready",
    connecting: "Connecting…",
    connected: "Connecting…",
    ready: "Listening — go ahead and speak",
    disconnecting: "Ending…",
    error: "Couldn't connect — try again",
};

function VoicePanel({ serverUrl, publicKey }: Props) {
    const client = usePipecatClient();
    const state = usePipecatClientTransportState();
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const live = state === "connected" || state === "ready" || state === "connecting";

    async function start() {
        if (!serverUrl) {
            setError("Voice server isn't configured yet.");
            return;
        }
        setError(null);
        setBusy(true);
        try {
            const url = `${serverUrl.replace(/\/$/, "")}/offer?key=${encodeURIComponent(publicKey)}`;
            // client-js accepts a connection_url that the transport POSTs the SDP
            // offer to; our server replies with the SDP answer.
            await client.connect({ connection_url: url } as Parameters<typeof client.connect>[0]);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't start the call.");
        } finally {
            setBusy(false);
        }
    }

    async function stop() {
        setBusy(true);
        try {
            await client.disconnect();
        } catch {
            /* already gone */
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="bg-neutral-0 rounded-4 border-100 p-4 d-flex flex-column align-items-center text-center">
            <span className="fw-600 fz-font-md neutral-900 mb-1">Talk to your agent</span>
            <span className="fz-font-sm neutral-500 mb-3">{error ?? STATUS[state] ?? state}</span>

            <button
                type="button"
                onClick={live ? stop : start}
                disabled={busy}
                aria-label={live ? "End voice chat" : "Start voice chat"}
                className={`btn rounded-circle d-inline-flex align-items-center justify-content-center ${live ? "btn-danger" : "btn-dark"}`}
                style={{ width: 72, height: 72 }}
            >
                {live ? STOP_ICON : MIC_ICON}
            </button>

            {state === "ready" && (
                <span className="mt-3 d-inline-flex align-items-center gap-2 fz-font-sm text-success fw-500">
                    <span className="d-inline-block rounded-circle bg-success" style={{ width: 8, height: 8 }} />
                    Live
                </span>
            )}

            <PipecatClientAudio />
        </div>
    );
}

export default function VoiceAgentWidget({ publicKey, serverUrl }: Props) {
    const clientRef = useRef<PipecatClient | null>(null);
    const [client, setClient] = useState<PipecatClient | null>(null);

    // Build the client AFTER fetching ICE servers from the voice server. Without
    // STUN+TURN the browser only gathers a private host candidate (the voice
    // server has no public UDP), so the WebRTC connection can never establish.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            let iceServers: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
            try {
                const base = serverUrl.replace(/\/$/, "");
                const res = await fetch(`${base}/ice?key=${encodeURIComponent(publicKey)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data?.iceServers) && data.iceServers.length) iceServers = data.iceServers;
                }
            } catch {
                /* fall back to STUN-only */
            }
            if (cancelled) return;
            const c = new PipecatClient({
                transport: new SmallWebRTCTransport({ iceServers, waitForICEGathering: true }),
                enableMic: true,
                enableCam: false,
            });
            clientRef.current = c;
            setClient(c);
        })();
        return () => {
            cancelled = true;
            clientRef.current?.disconnect().catch(() => {});
        };
    }, [serverUrl, publicKey]);

    if (!client) {
        return <div className="p-4 text-center neutral-500 fz-font-md">Preparing voice…</div>;
    }

    // client-js and client-react each ship their own PipecatClient type
    // declaration; they're the same class at runtime, so cast to the provider's
    // expected prop type to reconcile the (purely nominal) type identity.
    type ProviderClient = ComponentProps<typeof PipecatClientProvider>["client"];
    return (
        <PipecatClientProvider client={client as unknown as ProviderClient}>
            <VoicePanel publicKey={publicKey} serverUrl={serverUrl} />
        </PipecatClientProvider>
    );
}
