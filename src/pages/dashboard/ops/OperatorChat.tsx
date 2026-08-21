import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { RichText } from "@shared-chat/chatRich";
import {
  runOperator,
  listOperatorMessages,
  saveOperatorMessages,
  uploadOperatorFile,
  signOperatorFiles,
  WRITE_TOOL_LABELS,
  type OperatorMsg,
  type OperatorAttachment,
} from "@/lib/db/ops/operator";

/**
 * The AI Operator chat.
 *
 * Same agent as the full Operator page (`ops/agent/operator`): same edge
 * function, same governed write tools, same approval queue and audit trail, and
 * the same persisted thread — a conversation started here continues there. This
 * is the chat surface only; approvals, tool policy, memory and the audit log
 * stay on the full page, which the header links out to.
 *
 * Messages carry attachments (image / video / audio / any file). They live in a
 * PRIVATE storage bucket, so every render mints a short-lived signed URL rather
 * than holding a public link.
 */

// ---------------------------------------------------------------------------
// Icons — module-level consts, per the house style for inline SVG.
const ICON_CLIP = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21.4 11.05l-8.5 8.5a5 5 0 01-7.07-7.07l8.49-8.49a3.33 3.33 0 014.71 4.71l-8.48 8.49a1.67 1.67 0 01-2.36-2.36l7.78-7.78" />
  </svg>
);
const ICON_SEND = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
);
const ICON_MIC = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M5 11a7 7 0 0014 0M12 18v4M8 22h8" />
  </svg>
);
const ICON_CHECK = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);
const ICON_FILE = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" />
  </svg>
);
const ICON_SPEAK = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M15.5 8.5a5 5 0 010 7M19 5a9 9 0 010 14" />
  </svg>
);
const ICON_STOP = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);
const ICON_PLAY = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M8 5.2v13.6c0 .8.9 1.3 1.6.9l10.5-6.8a1 1 0 000-1.7L9.6 4.3A1 1 0 008 5.2z" />
  </svg>
);

const STARTERS = [
  "What needs my attention today?",
  "Which orders are still unfulfilled?",
  "Draft a reply to the newest unread conversation",
];

const dayKey = (iso?: string) => (iso ? new Date(iso).toDateString() : new Date().toDateString());

/** "Sunday, 8 Sep 2023" — the date separator format in the chat design. */
function dayLabel(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  const today = new Date().toDateString();
  const yest = new Date(Date.now() - 86_400_000).toDateString();
  if (d.toDateString() === today) return "Today";
  if (d.toDateString() === yest) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short", year: "numeric" });
}
/** "11.00 AM" */
const timeLabel = (iso?: string) =>
  (iso ? new Date(iso) : new Date())
    .toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    .replace(":", ".");

/** Read text aloud with the browser's built-in speech synthesis.
 *
 *  Free, offline and keyless — every modern browser ships OS voices — so the
 *  owner can HEAR a script even when no paid TTS provider is available. This is
 *  playback only: it produces sound, not a file. The `speak` tool is what
 *  produces a saveable recording, and that needs a provider.
 */
function speakAloud(text: string, onEnd: () => void): boolean {
  const synth = window.speechSynthesis;
  if (!synth) return false;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text.slice(0, 4000));
  u.lang = navigator.language || "en-US";
  u.rate = 1;
  // Prefer a natural local voice for the UI language, else let the OS decide.
  const voices = synth.getVoices();
  const pick =
    voices.find((v) => v.lang === u.lang && !v.localService) ??
    voices.find((v) => v.lang?.startsWith(u.lang.slice(0, 2)));
  if (pick) u.voice = pick;
  u.onend = onEnd;
  u.onerror = onEnd;
  synth.speak(u);
  return true;
}

const prettySize = (n?: number) =>
  n == null ? "" : n < 1024 ? `${n} B` : n < 1048576 ? `${Math.round(n / 1024)} KB` : `${(n / 1048576).toFixed(1)} MB`;

// ---------------------------------------------------------------------------
/** Renders a message's files: images tile into a grid, video/audio get players,
 *  anything else becomes a download row. */
function Attachments({ items, urls }: { items: OperatorAttachment[]; urls: Record<string, string> }) {
  if (!items?.length) return null;
  const images = items.filter((a) => a.kind === "image");
  const rest = items.filter((a) => a.kind !== "image");
  return (
    <div className="opc-att">
      {images.length > 0 && (
        <div className={`opc-grid${images.length > 1 ? " multi" : ""}`}>
          {images.map((a) => (
            <img key={a.path} src={urls[a.path]} alt={a.name} loading="lazy" width={160} height={110} />
          ))}
        </div>
      )}
      {rest.map((a) =>
        a.kind === "video" ? (
          <video key={a.path} className="opc-video" src={urls[a.path]} controls preload="metadata" />
        ) : a.kind === "audio" ? (
          <audio key={a.path} className="opc-audio" src={urls[a.path]} controls preload="metadata" />
        ) : (
          <a key={a.path} className="opc-file" href={urls[a.path]} target="_blank" rel="noreferrer">
            <span className="opc-file-ic" aria-hidden="true">{ICON_FILE}</span>
            <span className="opc-file-meta">
              <b>{a.name}</b>
              <i>{prettySize(a.size)}</i>
            </span>
          </a>
        ),
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
export default function OperatorChat({ orgId, opsBase }: { orgId: string; opsBase: string }) {
  const [msgs, setMsgs] = useState<OperatorMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<OperatorAttachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tools, setTools] = useState<string[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [speakingIdx, setSpeakingIdx] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Shared thread with the full Operator page — resume where it left off.
  useEffect(() => {
    let active = true;
    listOperatorMessages(orgId).then(({ data }) => {
      if (active) setMsgs(data.slice(-30));
    });
    return () => {
      active = false;
    };
  }, [orgId]);

  // The bucket is private, so paths need signing before anything can render.
  // One batched call per change rather than one per attachment.
  useEffect(() => {
    const paths = [...msgs.flatMap((m) => m.attachments ?? []), ...pending]
      .map((a) => a.path)
      .filter((p) => !urls[p]);
    if (paths.length === 0) return;
    let active = true;
    signOperatorFiles([...new Set(paths)]).then((signed) => {
      if (active && Object.keys(signed).length) setUrls((u) => ({ ...u, ...signed }));
    });
    return () => {
      active = false;
    };
  }, [msgs, pending, urls]);

  // Nothing should keep talking after the chat closes.
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  function togglePlayback(key: string, text: string) {
    if (speakingIdx === key) {
      window.speechSynthesis?.cancel();
      setSpeakingIdx(null);
      return;
    }
    const ok = speakAloud(text, () => setSpeakingIdx(null));
    if (!ok) setError("This browser can't read messages aloud.");
    else setSpeakingIdx(key);
  }

  /** The first scroll is a jump, not a journey. The thread loads async, so
   *  msgs.length goes 0 -> N after mount and this effect fires; animating that
   *  meant watching the panel travel the height of the whole history every time
   *  the page opened. Only messages that arrive while you are watching animate. */
  const settled = useRef(false);
  useEffect(() => {
    const t = setTimeout(() => {
      const el = bodyRef.current;
      if (!el) return;
      el.scrollTo({ top: el.scrollHeight, behavior: settled.current ? "smooth" : "auto" });
      // Only count as settled once there was a thread to land in. The effect
      // also runs on mount with msgs still empty; marking it settled there
      // would make the real history animate the moment the fetch resolved,
      // which is the exact behaviour this is removing.
      if (msgs.length > 0) settled.current = true;
    }, 60);
    return () => clearTimeout(t);
  }, [msgs.length, busy]);

  // Group consecutive same-sender messages, split by day — the design shows one
  // avatar/name/time footer per group, under a day separator.
  const groups = useMemo(() => {
    const out: { day: string; role: OperatorMsg["role"]; items: OperatorMsg[] }[] = [];
    for (const m of msgs) {
      const day = dayKey(m.created_at);
      const last = out[out.length - 1];
      if (last && last.role === m.role && last.day === day) last.items.push(m);
      else out.push({ day, role: m.role, items: [m] });
    }
    return out;
  }, [msgs]);

  async function pickFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    for (const f of Array.from(files).slice(0, 5)) {
      const { attachment, error: err } = await uploadOperatorFile(orgId, f);
      if (err) setError(err);
      else if (attachment) setPending((p) => [...p, attachment]);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  /** Dictation via the browser's speech API — fills the composer rather than
   *  starting a call, so the text is reviewable before it is sent. */
  function dictate() {
    type SR = { start: () => void; stop: () => void; onresult: ((e: SpeechEvent) => void) | null; onend: (() => void) | null; lang: string; interimResults: boolean };
    type SpeechEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      setError("Voice input isn't supported in this browser — type your message instead.");
      return;
    }
    const rec = new Ctor();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = false;
    rec.onresult = (e) => {
      const said = Array.from(e.results as ArrayLike<ArrayLike<{ transcript: string }>>)
        .map((r) => r[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (said) setDraft((d) => (d ? `${d} ${said}` : said));
    };
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  }

  async function send(text: string) {
    const q = text.trim();
    if ((!q && pending.length === 0) || busy) return;
    let history = [...msgs];
    while (history.length && history[0].role === "assistant") history = history.slice(1);

    const outgoing: OperatorMsg = {
      role: "user",
      content: q || (pending.length === 1 ? `Sent ${pending[0].name}` : `Sent ${pending.length} files`),
      attachments: pending,
      created_at: new Date().toISOString(),
    };
    setMsgs((m) => [...m, outgoing]);
    setDraft("");
    setPending([]);
    setBusy(true);
    setError(null);
    setTools([]);

    // The agent reads text; name the files so it knows what came with the turn.
    const note = outgoing.attachments?.length
      ? `${q}\n\n[Attached: ${outgoing.attachments.map((a) => `${a.name} (${a.kind})`).join(", ")}]`
      : q;

    const { reply, toolCalls, attachments, error: err } = await runOperator(orgId, note, history);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    const answer: OperatorMsg = {
      role: "assistant",
      // A turn that only produced a voice note still needs something to read.
      content: reply || (attachments.length ? "Here's the recording." : "Done."),
      attachments,
      created_at: new Date().toISOString(),
    };
    setMsgs((m) => [...m, answer]);
    setTools(toolCalls ?? []);
    saveOperatorMessages(orgId, [outgoing, answer]);
  }

  return (
    <section className="opc" aria-label="AI Operator">
      <header className="opc-head">
        <h2>AI Operator</h2>
        <Link to={`${opsBase}/agent/operator`}>Approvals &amp; audit →</Link>
      </header>

      <div className="opc-body" ref={bodyRef} aria-live="polite">
        {groups.length === 0 && !busy && (
          <div className="opc-empty">
            <p>Ask for anything across this business — or tell me to do it.</p>
            <div className="opc-starters">
              {STARTERS.map((s) => (
                <button key={s} type="button" onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {groups.map((g, gi) => {
          const newDay = gi === 0 || groups[gi - 1].day !== g.day;
          const mine = g.role === "user";
          const last = g.items[g.items.length - 1];
          return (
            <div key={`${g.day}-${gi}`}>
              {newDay && <div className="opc-day"><span>{dayLabel(last.created_at)}</span></div>}
              <div className={`opc-group ${mine ? "mine" : "theirs"}`}>
                {g.items.map((m, i) => {
                  const key = `${gi}-${i}`;
                  return (
                    <div key={i} className="opc-row">
                      <div className="opc-bubble rich">
                        {m.content && <RichText text={m.content} />}
                        <Attachments items={m.attachments ?? []} urls={urls} />
                      </div>
                      {mine ? (
                        <span className="opc-tick" aria-hidden="true">{ICON_CHECK}</span>
                      ) : (
                        m.content && (
                          <button
                            type="button"
                            className={`opc-say${speakingIdx === key ? " on" : ""}`}
                            onClick={() => togglePlayback(key, m.content)}
                            aria-label={speakingIdx === key ? "Stop reading" : "Read this aloud"}
                          >
                            {speakingIdx === key ? ICON_STOP : ICON_SPEAK}
                          </button>
                        )
                      )}
                    </div>
                  );
                })}
                <div className="opc-meta">
                  <span className="opc-av" aria-hidden="true">{mine ? "You" : "AI"}</span>
                  <b>{mine ? "You" : "AI Operator"}</b>
                  <i>{timeLabel(last.created_at)}</i>
                </div>
              </div>
            </div>
          );
        })}

        {busy && (
          <div className="opc-group theirs">
            <div className="opc-row"><div className="opc-bubble opc-typing"><i /><i /><i /></div></div>
          </div>
        )}
        {tools.length > 0 && !busy && (
          <div className="opc-tools">
            {tools.map((t, i) => <span key={`${t}-${i}`}>{WRITE_TOOL_LABELS[t] ?? t.replace(/_/g, " ")}</span>)}
          </div>
        )}
        {error && <div className="opc-err" role="alert">{error}</div>}
      </div>

      {pending.length > 0 && (
        <div className="opc-pending">
          {pending.map((a) => (
            <span key={a.path}>
              {a.name}
              <button type="button" aria-label={`Remove ${a.name}`}
                      onClick={() => setPending((p) => p.filter((x) => x.path !== a.path))}>×</button>
            </span>
          ))}
        </div>
      )}

      <form className="opc-form" onSubmit={(e) => { e.preventDefault(); send(draft); }}>
        <div className="opc-input">
          <button type="button" className="opc-clip" onClick={() => fileRef.current?.click()}
                  disabled={uploading} aria-label="Attach a file">
            {ICON_CLIP}
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            hidden
            onChange={(e) => pickFiles(e.target.files)}
            accept="image/*,video/*,audio/*,.pdf,.csv,.txt,.doc,.docx,.xls,.xlsx"
          />
          <input
            className="opc-text"
            placeholder={uploading ? "Uploading…" : "Type a message"}
            aria-label="Message your operator"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={busy}
          />
          <button type="submit" className="opc-send" aria-label="Send"
                  disabled={busy || uploading || (!draft.trim() && pending.length === 0)}>
            {ICON_SEND}
          </button>
        </div>
        <button type="button" className={`opc-mic${listening ? " on" : ""}`} onClick={dictate}
                aria-label={listening ? "Listening…" : "Dictate a message"} aria-pressed={listening}>
          {listening ? ICON_PLAY : ICON_MIC}
        </button>
      </form>
    </section>
  );
}
