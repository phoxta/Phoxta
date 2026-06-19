import { useEffect, useRef, useState } from "react";
import type { StudioConversation } from "./useStudioConversation";

/**
 * Conversational voice page-builder (Web Speech transport).
 *
 * A continuous back-and-forth: listen → transcribe → run through the shared
 * conversation core (page_edit → ops → apply) → speak the assistant's reply →
 * listen again. The agent keeps page context across turns and confirms each
 * change out loud, so you can build a page hands-free by talking.
 *
 * Transport-swappable by design: the listen/think/speak loop only depends on
 * `convo.send` + browser speech, so a Pipecat realtime transport can replace the
 * Web Speech pieces later without changing the conversation core or the editor.
 */

// Minimal typing for the (vendor-prefixed, not in TS DOM lib) Web Speech API.
type SpeechResultList = ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
type SpeechEvent = { results: SpeechResultList; resultIndex: number };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecognitionCtor = new () => Recognition;

function getRecognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type Phase = "idle" | "listening" | "thinking" | "speaking";

const PHASE_LABEL: Record<Phase, string> = {
  idle: "Tap to start talking",
  listening: "Listening…",
  thinking: "Working on it…",
  speaking: "Responding…",
};

export default function VoiceStudioDock({ convo }: { convo: StudioConversation }) {
  const { messages, send } = convo;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<Recognition | null>(null);
  const activeRef = useRef(false);
  // Mirror phase into a ref so recognition event handlers read the live value.
  const phaseRef = useRef<Phase>("idle");
  phaseRef.current = phase;
  const supported = typeof window !== "undefined" && getRecognitionCtor() !== null && "speechSynthesis" in window;

  function speak(text: string, onDone: () => void) {
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.02;
      u.onend = onDone;
      u.onerror = onDone;
      window.speechSynthesis.speak(u);
    } catch {
      onDone();
    }
  }

  function beginListen() {
    if (!activeRef.current) return;
    const rec = recognitionRef.current;
    if (!rec) return;
    setInterim("");
    setPhase("listening");
    try {
      rec.start();
    } catch {
      /* start() throws if already started — ignore */
    }
  }

  async function handleUtterance(text: string) {
    setPhase("thinking");
    const reply = await send(text);
    if (!activeRef.current) {
      setPhase("idle");
      return;
    }
    if (reply) {
      setPhase("speaking");
      speak(reply, () => (activeRef.current ? beginListen() : setPhase("idle")));
    } else {
      // No reply (e.g. an error) — keep the conversation going.
      beginListen();
    }
  }

  function ensureRecognition(): Recognition | null {
    if (recognitionRef.current) return recognitionRef.current;
    const Ctor = getRecognitionCtor();
    if (!Ctor) return null;
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = true;

    rec.onresult = (e: SpeechEvent) => {
      let finalText = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const alt = e.results[i][0];
        if (e.results[i].isFinal) finalText += alt.transcript;
        else interimText += alt.transcript;
      }
      setInterim(interimText);
      if (finalText.trim()) {
        try {
          rec.stop();
        } catch {
          /* noop */
        }
        setInterim("");
        void handleUtterance(finalText);
      }
    };

    rec.onerror = (e: { error: string }) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setError("Microphone permission is blocked. Allow it in your browser to use voice.");
        stop();
      }
      // 'no-speech' / 'aborted' are benign; onend handles re-listening.
    };

    rec.onend = () => {
      // Ended with no final result while still active and waiting → keep listening.
      if (activeRef.current && phaseRef.current === "listening") beginListen();
    };

    recognitionRef.current = rec;
    return rec;
  }

  function start() {
    setError(null);
    if (!ensureRecognition()) {
      setError("Voice isn't supported in this browser. Try Chrome or Edge.");
      return;
    }
    activeRef.current = true;
    setActive(true);
    beginListen();
  }

  function stop() {
    activeRef.current = false;
    setActive(false);
    setPhase("idle");
    setInterim("");
    try {
      recognitionRef.current?.abort();
    } catch {
      /* noop */
    }
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* noop */
    }
  }

  // Tear down on unmount.
  useEffect(
    () => () => {
      activeRef.current = false;
      try {
        recognitionRef.current?.abort();
      } catch {
        /* noop */
      }
      try {
        window.speechSynthesis?.cancel();
      } catch {
        /* noop */
      }
    },
    [],
  );

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open voice builder"
        className="btn btn-dark rounded-circle d-inline-flex align-items-center justify-content-center shadow"
        style={{ position: "fixed", left: 24, bottom: 24, width: 52, height: 52, zIndex: 9999 }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="22" />
        </svg>
      </button>
    );
  }

  return (
    <div
      className="bg-neutral-0 rounded-4 border-100 shadow-lg d-flex flex-column"
      style={{ position: "fixed", left: 24, bottom: 24, width: 320, zIndex: 9999 }}
      role="dialog"
      aria-label="Voice page builder"
    >
      <div className="d-flex align-items-center gap-2 px-3 py-2 border-bottom">
        <span className="fw-600 fz-font-md neutral-900">Voice builder</span>
        <button
          type="button"
          className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none ms-auto"
          onClick={() => {
            stop();
            setOpen(false);
          }}
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div className="px-3 py-3 d-flex flex-column align-items-center text-center">
        {!supported ? (
          <p className="neutral-500 fz-font-md mb-0">Voice isn't supported in this browser. Try Chrome or Edge.</p>
        ) : (
          <>
            <button
              type="button"
              onClick={active ? stop : start}
              aria-label={active ? "Stop talking" : "Start talking"}
              className={`btn rounded-circle d-inline-flex align-items-center justify-content-center mb-2 ${active ? "btn-danger" : "btn-dark"}`}
              style={{ width: 64, height: 64 }}
            >
              {active ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
              )}
            </button>

            <span
              className={`fz-font-sm fw-500 ${phase === "listening" ? "text-success" : phase === "thinking" ? "text-primary" : "neutral-500"}`}
            >
              {PHASE_LABEL[phase]}
            </span>

            {interim && <p className="fz-font-sm neutral-500 fst-italic mt-2 mb-0">“{interim}”</p>}

            {lastAssistant && (
              <p className="fz-font-md neutral-900 mt-3 mb-0 bg-neutral-100 rounded-3 px-3 py-2">{lastAssistant.content}</p>
            )}
          </>
        )}
      </div>

      {error && <div className="alert alert-warning py-1 px-3 fz-font-sm mx-3 mb-2">{error}</div>}
    </div>
  );
}
