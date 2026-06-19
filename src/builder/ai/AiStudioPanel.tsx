import { useEffect, useRef, useState } from "react";
import type { StudioConversation } from "./useStudioConversation";

const SUGGESTIONS = [
  "Add an about hero at the top",
  "Make the headline punchier",
  "Add a testimonials section",
];

/**
 * In-editor AI text chat. Reads/writes the live document through the shared
 * conversation core (so it stays in lock-step with the voice dock). Renders as a
 * fixed dock; mounted inside <Puck> via the headerActions override.
 */
export default function AiStudioPanel({ convo }: { convo: StudioConversation }) {
  const { messages, busy, error, send } = convo;
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  function submit(text?: string) {
    const value = (text ?? input).trim();
    if (!value) return;
    setInput("");
    void send(value);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open AI assistant"
        className="btn btn-dark rounded-pill d-inline-flex align-items-center gap-2 shadow"
        style={{ position: "fixed", right: 24, bottom: 24, zIndex: 9999 }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3l1.9 4.8L18.7 9l-4.8 1.9L12 15.7 10.1 10.9 5.3 9l4.8-1.2L12 3z" />
          <path d="M19 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z" />
        </svg>
        Ask AI
      </button>
    );
  }

  return (
    <div
      className="bg-neutral-0 rounded-4 border-100 shadow-lg d-flex flex-column"
      style={{ position: "fixed", right: 24, bottom: 24, width: 360, maxHeight: "70vh", zIndex: 9999 }}
      role="dialog"
      aria-label="AI assistant"
    >
      <div className="d-flex align-items-center gap-2 px-3 py-2 border-bottom">
        <span className="fw-600 fz-font-md neutral-900">AI assistant</span>
        <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none ms-auto" onClick={() => setOpen(false)} aria-label="Close">
          ✕
        </button>
      </div>

      <div ref={scrollRef} className="px-3 py-3 flex-grow-1" style={{ overflowY: "auto" }}>
        {messages.length === 0 ? (
          <div className="neutral-500 fz-font-md">
            <p className="mb-2">Describe what to build or change. For example:</p>
            <div className="d-flex flex-column gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" className="btn btn-outline-dark btn-sm rounded-3 text-start" onClick={() => submit(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`rounded-3 px-3 py-2 fz-font-md ${
                  m.role === "user" ? "bg-neutral-900 text-white align-self-end" : "bg-neutral-100 neutral-900 align-self-start"
                }`}
                style={{ maxWidth: "85%" }}
              >
                {m.content}
              </div>
            ))}
            {busy && <div className="bg-neutral-100 neutral-500 rounded-3 px-3 py-2 fz-font-md align-self-start">Thinking…</div>}
          </div>
        )}
      </div>

      {error && <div className="alert alert-warning py-1 px-3 fz-font-sm mx-3 mb-2">{error}</div>}

      <form
        className="d-flex gap-2 p-2 border-top"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          className="form-control rounded-3 fz-font-md"
          placeholder="Ask the assistant…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
        />
        <button type="submit" className="btn btn-dark rounded-3 px-3" disabled={busy || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
