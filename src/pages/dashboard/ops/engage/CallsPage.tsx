import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Mic, Phone, PhoneIncoming, PhoneOff, PhoneOutgoing, X } from "lucide-react";
import { useEngageOps } from "@/lib/db/ops/engageAreas";
import { placeCall } from "@/lib/db/ops/agent";
import { listContacts, type Contact } from "@/lib/db/ops/crm";
import {
  connectBrowserCall,
  listLiveVoiceConversations,
  listRecentCalls,
  logBrowserCall,
  summarizeCalls,
  type CallRow,
  type LiveVoiceConversation,
  type Softphone,
} from "@/lib/db/ops/calls";
import { callablePhone, displayPhone } from "@/lib/ops/phone";
import { toast, toastError } from "@/lib/ops/feedback";
import { Card, Chip, Empty, StatTile } from "@/components/dash/Ui";

/**
 * Engage → Calls: the voice side of the console in one place.
 *
 * Three honest surfaces over the infrastructure that actually exists:
 *  - the call log (call_logs: AI-answered inbound, AI/bridge outbound via
 *    place-call, and browser calls logged client-side on hang-up);
 *  - a live view at the TRANSCRIPT level — voice turns are written to
 *    conversation_messages as the call happens, so recent voice activity is
 *    observable; audio listen-in/barge is not wired anywhere (plain <Dial>
 *    TwiML, no Conference, no observer leg on the voice server), so this page
 *    documents that as the next step instead of faking it;
 *  - click-to-call three ways, each labelled for who actually speaks: the AI
 *    (place-call "ai"), you via phone bridge (place-call "bridge"), or you from
 *    this browser (voice-token softphone shared with the Inbox).
 */

type ChipTone = "plain" | "blue" | "orange" | "ok" | "warn" | "danger" | "solid" | "line";
const OUTCOME_TONE: Record<string, ChipTone> = {
  booked: "ok",
  completed: "plain",
  escalated: "warn",
  failed: "danger",
  missed: "danger",
  dialing: "blue",
  simulated: "line",
};

const MODES: { v: "ai" | "bridge" | "browser"; label: string }[] = [
  { v: "ai", label: "AI agent calls" },
  { v: "bridge", label: "Call me, then connect" },
  { v: "browser", label: "Talk from this browser" },
];

const MODE_NOTE: Record<"ai" | "bridge" | "browser", string> = {
  ai: "Your AI agent dials the customer from your business number and speaks with them — add an optional opening line below. Placing the call needs an owner/admin account.",
  bridge:
    "We call you first — on your profile phone unless you enter another number below — then bridge the customer in with your business caller ID. You speak; the AI is not on this call.",
  browser:
    "You talk from this tab over your microphone and speakers — allow mic access when prompted. When you hang up, the call is logged below.",
};

/** Page-local styles on top of the shared .hrx kit. */
const CSS = `
.clx .hrx-pill { display: inline-flex; align-items: center; gap: 6px; }
.clx-head { display: flex; align-items: center; justify-content: space-between; gap: 10px 12px; flex-wrap: wrap; margin-bottom: 14px; }
.clx-title { font-size: 20px; font-weight: 600; letter-spacing: -0.02em; margin: 0; }
.clx-sub { font-size: 13.5px; color: var(--hrx-muted); }
.clx-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; margin-bottom: 14px; }
.clx-grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0 14px; }
.clx-note { font-size: 13px; color: var(--hrx-muted); background: var(--hrx-soft); border: 1px solid var(--hrx-border-soft); border-radius: 12px; padding: 10px 12px; line-height: 1.55; }
.clx-warn { font-size: 13px; color: #b45309; background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 8px 12px; margin-bottom: 10px; }
.clx-hint { font-size: 12.5px; color: var(--hrx-muted); margin: -6px 0 10px; }
.clx-modes { display: flex; gap: 8px; flex-wrap: wrap; margin: 2px 0 10px; }
.clx-oncall { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; background: var(--hrx-soft); border: 1px solid var(--hrx-border-soft); border-radius: 12px; padding: 12px 14px; margin-top: 12px; }
.clx-dur { font-variant-numeric: tabular-nums; font-weight: 600; font-size: 15px; }
.clx-row { display: flex; align-items: flex-start; gap: 12px; padding: 12px 0; border-top: 1px solid #f1f2f4; }
.clx-row:first-of-type { border-top: 0; }
.clx-dir { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex: 0 0 34px; background: var(--hrx-soft); color: var(--hrx-ink); }
.clx-main { flex: 1 1 auto; min-width: 0; }
.clx-line1 { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; font-size: 14px; }
.clx-who { font-weight: 600; color: var(--hrx-ink); overflow-wrap: anywhere; }
.clx-loc { font-size: 12.5px; color: var(--hrx-muted); }
.clx-time { margin-left: auto; font-size: 12px; color: var(--hrx-muted); white-space: nowrap; }
.clx-line2 { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 4px; font-size: 12.5px; color: var(--hrx-muted); }
.clx-line2 a { color: var(--hrx-ink); font-weight: 500; text-decoration: none; }
.clx-line2 a:hover { text-decoration: underline; }
.clx-audio { width: min(340px, 100%); height: 32px; margin-top: 6px; display: block; }
.clx-quiet { font-size: 13px; color: var(--hrx-muted); }
.clx-dot { width: 8px; height: 8px; border-radius: 999px; background: #16a34a; flex: 0 0 8px; animation: clx-pulse 1.4s infinite; }
@keyframes clx-pulse {
  0% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.45); }
  70% { box-shadow: 0 0 0 7px rgba(22, 163, 74, 0); }
  100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
}
@media (prefers-reduced-motion: reduce) { .clx-dot { animation: none; } }
`;

const fmtDur = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

function relTime(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const agoSec = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));

// ---------------------------------------------------------------------------

export default function CallsPage() {
  const { orgId } = useEngageOps();

  // ── Log + live data, polled every 15s while the tab is visible ────────────
  const [rows, setRows] = useState<CallRow[]>([]);
  const [liveConvos, setLiveConvos] = useState<LiveVoiceConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [calls, live] = await Promise.all([
      listRecentCalls(orgId, { sinceDays: 30, limit: 500 }),
      listLiveVoiceConversations(orgId),
    ]);
    setRows(calls.data);
    if (!live.error) setLiveConvos(live.data);
    setError(calls.error);
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    load();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 15_000);
    return () => clearInterval(t);
  }, [load]);

  const stats = useMemo(() => summarizeCalls(rows), [rows]);

  // ── CRM contacts for the picker (only ones with a dialable phone) ─────────
  const [contacts, setContacts] = useState<Contact[]>([]);
  useEffect(() => {
    listContacts(orgId).then(({ data }) => setContacts(data));
  }, [orgId]);
  const dialable = useMemo(() => contacts.filter((c) => callablePhone(c.phone)), [contacts]);

  // ── New-call composer ─────────────────────────────────────────────────────
  const [composerOpen, setComposerOpen] = useState(false);
  const [toRaw, setToRaw] = useState("");
  const [toName, setToName] = useState("");
  const [mode, setMode] = useState<"ai" | "bridge" | "browser">("ai");
  const [opening, setOpening] = useState("");
  const [agentPhone, setAgentPhone] = useState("");
  const [placing, setPlacing] = useState(false);
  const dialTo = callablePhone(toRaw);

  // Browser softphone (shared wiring with the Inbox — see db/ops/calls).
  const [connecting, setConnecting] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const phoneRef = useRef<Softphone | null>(null);
  const tickRef = useRef<number | null>(null);
  const stopTicker = () => {
    if (tickRef.current != null) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };
  useEffect(
    () => () => {
      phoneRef.current?.hangUp();
      stopTicker();
    },
    [],
  );

  function pickContact(e: React.ChangeEvent<HTMLSelectElement>) {
    const c = dialable.find((x) => x.id === e.target.value);
    if (!c) return;
    setToRaw(c.phone);
    setToName(c.name || "");
  }

  /** mode "ai" / "bridge": place-call does the dialling and writes the log row. */
  async function placeServerCall() {
    if (!dialTo || placing || mode === "browser") return;
    setPlacing(true);
    const r = await placeCall(orgId, dialTo, {
      mode,
      opening: mode === "ai" ? opening.trim() || undefined : undefined,
      agentPhone: mode === "bridge" ? agentPhone.trim() || undefined : undefined,
    });
    setPlacing(false);
    if (!r.ok) {
      toastError(r.error ?? "Call could not be placed.");
      return;
    }
    toast(
      mode === "ai"
        ? `Calling ${dialTo} — your AI agent will speak with them.`
        : `Calling you${agentPhone.trim() ? ` on ${agentPhone.trim()}` : ""} — pick up and we'll connect ${dialTo}.`,
    );
    setComposerOpen(false);
    setOpening("");
    load(); // place-call inserted its call_logs row
  }

  async function startBrowserCall() {
    if (!dialTo || connecting || inCall) return;
    setConnecting(true);
    const target = dialTo;
    const { phone, error: err } = await connectBrowserCall(orgId, target, {
      onAccept: () => {
        setInCall(true);
        setConnecting(false);
        setSeconds(0);
        tickRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
      },
      onEnd: (durationSec) => {
        phoneRef.current = null;
        stopTicker();
        setInCall(false);
        setConnecting(false);
        setMuted(false);
        // No server leg logs a browser call — record it so it lands in the log.
        if (durationSec > 0) {
          logBrowserCall(orgId, target, durationSec).then(({ error: logErr }) => {
            if (logErr) toastError(logErr);
            else toast("Call ended — it's in the log below.");
            load();
          });
        }
      },
      onError: (msg) => toastError(`Call error: ${msg}`),
    });
    if (err || !phone) {
      setConnecting(false);
      toastError(err ?? "Browser calling isn't configured.");
      return;
    }
    phoneRef.current = phone;
  }
  function hangUp() {
    phoneRef.current?.hangUp();
    phoneRef.current = null;
  }
  function toggleMute() {
    if (!phoneRef.current) return;
    const m = !muted;
    phoneRef.current.mute(m);
    setMuted(m);
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="clx">
      <style>{CSS}</style>

      <div className="clx-head">
        <div style={{ minWidth: 0 }}>
          <h1 className="clx-title">Calls</h1>
          <div className="clx-sub">Every call your business took or made — live, recorded, and one click from its conversation.</div>
        </div>
        <button type="button" className="hrx-pill primary" onClick={() => setComposerOpen((o) => !o)}>
          <Phone width={14} height={14} /> New call
        </button>
      </div>

      {/* ── Stats (last 30 days, from the same rows as the log below) ──────── */}
      <div className="clx-stats">
        <StatTile label="Calls · 30 days" value={stats.total} tone="dark" />
        <StatTile label="Inbound · outbound" value={`${stats.inbound} · ${stats.outbound}`} />
        <StatTile label="After-hours answered" value={stats.afterHours} tone="soft" />
        <StatTile label="Booked · escalated" value={`${stats.booked} · ${stats.escalated}`} tone="blue" />
      </div>

      {/* ── New call ───────────────────────────────────────────────────────── */}
      {composerOpen && (
        <Card
          className="mb-3"
          title="New call"
          right={
            <button type="button" className="hrx-pill" onClick={() => setComposerOpen(false)} disabled={inCall || connecting}>
              <X width={13} height={13} /> Close
            </button>
          }
        >
          <div className="clx-grid2">
            <label className="hrx-field">
              <span>Phone number</span>
              <input
                type="tel"
                className="form-control"
                placeholder="+44 7700 900123"
                value={toRaw}
                disabled={inCall || connecting}
                onChange={(e) => {
                  setToRaw(e.target.value);
                  setToName("");
                }}
              />
            </label>
            <label className="hrx-field">
              <span>Or pick a contact</span>
              <select className="form-select" value="" onChange={pickContact} disabled={dialable.length === 0 || inCall || connecting}>
                <option value="">
                  {dialable.length ? `Choose from CRM (${dialable.length})…` : "No contacts with phone numbers yet"}
                </option>
                {dialable.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || "Unnamed"} · {c.phone}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {toRaw.trim() && !dialTo && (
            <div className="clx-warn">That doesn&apos;t look like a dialable number — use international format, e.g. +447700900123.</div>
          )}
          {toName && dialTo && <div className="clx-hint">Calling {toName} on {dialTo}.</div>}

          <div className="clx-modes" role="group" aria-label="Who speaks on this call">
            {MODES.map((m) => (
              <button
                key={m.v}
                type="button"
                className={`hrx-pill${mode === m.v ? " dark" : ""}`}
                aria-pressed={mode === m.v}
                disabled={inCall || connecting}
                onClick={() => setMode(m.v)}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="clx-note" style={{ marginBottom: 12 }}>{MODE_NOTE[mode]}</div>

          {mode === "ai" && (
            <label className="hrx-field">
              <span>Opening line — optional</span>
              <input
                className="form-control"
                placeholder="e.g. Hi, I'm calling about your order…"
                value={opening}
                onChange={(e) => setOpening(e.target.value)}
              />
            </label>
          )}
          {mode === "bridge" && (
            <label className="hrx-field">
              <span>Your number — blank uses your profile phone</span>
              <input
                type="tel"
                className="form-control"
                placeholder="+44 7700 900456"
                value={agentPhone}
                onChange={(e) => setAgentPhone(e.target.value)}
              />
            </label>
          )}

          {mode === "browser" && (connecting || inCall) ? (
            <div className="clx-oncall">
              <span className="clx-dot" aria-hidden="true" />
              <span className="clx-dur">{fmtDur(seconds)}</span>
              <span className="clx-quiet">{connecting ? `Calling ${dialTo}…` : `On call with ${dialTo}`}</span>
              <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                {inCall && (
                  <button type="button" className="hrx-pill" onClick={toggleMute}>
                    <Mic width={13} height={13} /> {muted ? "Unmute" : "Mute"}
                  </button>
                )}
                <button type="button" className="hrx-pill dark" onClick={hangUp}>
                  <PhoneOff width={13} height={13} /> Hang up
                </button>
              </span>
            </div>
          ) : (
            <button
              type="button"
              className="hrx-pill primary"
              disabled={!dialTo || placing || connecting}
              onClick={mode === "browser" ? startBrowserCall : placeServerCall}
            >
              <Phone width={14} height={14} />
              {placing || connecting
                ? "…"
                : mode === "ai"
                  ? "Have the AI call them"
                  : mode === "bridge"
                    ? "Call me, then connect"
                    : "Start call from this browser"}
            </button>
          )}
        </Card>
      )}

      {/* ── Live now ───────────────────────────────────────────────────────── */}
      <Card className="mb-3" title="Live now" right={liveConvos.length > 0 ? <Chip tone="ok">{liveConvos.length} active</Chip> : undefined}>
        {liveConvos.length === 0 ? (
          <div className="clx-quiet mb-3">No calls in progress — voice conversations appear here within seconds of activity.</div>
        ) : (
          <div className="mb-3">
            {liveConvos.map((c) => (
              <div key={c.id} className="clx-row">
                <span className="clx-dir" style={{ background: "#dcfce7", color: "#166534" }}>
                  <Phone width={15} height={15} />
                </span>
                <div className="clx-main">
                  <div className="clx-line1">
                    <span className="clx-dot" aria-hidden="true" />
                    <span className="clx-who">{c.customer_name || displayPhone(c.customer_phone) || "Caller"}</span>
                    <span className="clx-time">last turn {agoSec(c.last_message_at)}s ago</span>
                  </div>
                  <div className="clx-line2">
                    <span>The AI is on this call — the transcript updates turn by turn.</span>
                    <Link to={`../inbox?c=${c.id}`}>Watch transcript →</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="clx-note">
          <b>What &ldquo;live&rdquo; means here.</b> While a caller talks to the AI, every turn is written to the
          conversation as it happens, so an active call shows up above and its transcript can be followed in real time
          from the Inbox. <b>Audio listen-in and mid-call takeover are not available yet</b> — calls are bridged with
          plain dial TwiML (no Twilio Conference) and the voice server exposes no observer leg. To add them, the voice
          server must publish a listen-only audio stream per active call (or calls must move into a Twilio Conference so
          a supervisor leg can join and barge), and the browser voice token must allow incoming connections. Until that
          exists, this page shows transcript-level liveness only — it never simulates a live audio feed.
        </div>
      </Card>

      {/* ── Call log ───────────────────────────────────────────────────────── */}
      <Card title="Call log" right={<span className="clx-quiet">last 30 days · refreshes every 15s</span>}>
        {error && <div className="clx-warn">{error}</div>}
        {loading ? (
          <div className="clx-quiet">Loading calls…</div>
        ) : rows.length === 0 ? (
          <Empty icon={<Phone width={20} height={20} />} title="No calls yet">
            Inbound calls answered by your AI and outbound calls placed from the console all land here, with their
            outcome and recording.
          </Empty>
        ) : (
          rows.map((c) => {
            const inbound = c.direction === "inbound";
            const num = displayPhone(inbound ? c.from_number : c.to_number);
            return (
              <div key={c.id} className="clx-row">
                <span className="clx-dir" title={inbound ? "Inbound" : "Outbound"}>
                  {inbound ? <PhoneIncoming width={15} height={15} /> : <PhoneOutgoing width={15} height={15} />}
                </span>
                <div className="clx-main">
                  <div className="clx-line1">
                    <span className="clx-who">{num ?? (inbound ? "Inbound call" : "Outbound call")}</span>
                    {c.locations?.name && <span className="clx-loc">· {c.locations.name}</span>}
                    <span className="clx-time">{relTime(c.created_at)}</span>
                  </div>
                  <div className="clx-line2">
                    <Chip tone={OUTCOME_TONE[c.outcome] ?? "plain"}>{c.outcome}</Chip>
                    {c.after_hours && <Chip tone="orange">after hours</Chip>}
                    {c.duration_sec > 0 && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Clock width={12} height={12} /> {fmtDur(c.duration_sec)}
                      </span>
                    )}
                    {c.conversation_id && <Link to={`../inbox?c=${c.conversation_id}`}>Conversation →</Link>}
                  </div>
                  {c.recording_url && <audio className="clx-audio" controls preload="none" src={c.recording_url} />}
                </div>
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
}
