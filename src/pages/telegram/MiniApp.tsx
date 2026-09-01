// Phoxta — Telegram Mini App: the operator console, launched inside the chat.
//
// Telegram opens this page in its own webview and puts the signed initData in the
// URL fragment (#tgWebAppData=…) along with the theme. We read both from the
// fragment — no external SDK, so nothing to allow through the CSP — and send the
// initData to telegram-miniapp with every call, which re-validates the signature.
// The Supabase session isn't involved: identity is the Telegram signature.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Approval = { id: string; title: string };
type Stats = { ordersToday: number; revenueToday: number; pendingOrders: number; openConversations: number };
type State = { org: { name: string; currency: string }; stats: Stats; approvals: Approval[] };
type ChatLine = { role: "you" | "operator"; text: string };

const FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-miniapp`;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

/** Telegram hands the page its data in the URL fragment. */
function readFragment(): { initData: string; theme: Record<string, string> } {
  const frag = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  let theme: Record<string, string> = {};
  try { theme = JSON.parse(frag.get("tgWebAppThemeParams") ?? "{}"); } catch { /* default */ }
  return { initData: frag.get("tgWebAppData") ?? "", theme };
}

export default function TelegramMiniApp() {
  const { initData, theme } = useMemo(readFragment, []);
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatLine[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [deciding, setDeciding] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const call = useCallback(async (payload: Record<string, unknown>) => {
    const res = await fetch(FN, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
      body: JSON.stringify({ initData, ...payload }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message ?? data?.error ?? "Something went wrong.");
    return data;
  }, [initData]);

  const refresh = useCallback(async () => {
    try { setState(await call({ action: "state" })); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }, [call]);

  useEffect(() => {
    // Native look: paint from Telegram's theme so the page belongs in the chat.
    const r = document.documentElement.style;
    if (theme.bg_color) r.setProperty("--tg-bg", theme.bg_color);
    if (theme.text_color) r.setProperty("--tg-text", theme.text_color);
    if (theme.hint_color) r.setProperty("--tg-hint", theme.hint_color);
    if (theme.button_color) r.setProperty("--tg-btn", theme.button_color);
    if (theme.button_text_color) r.setProperty("--tg-btn-text", theme.button_text_color);
    if (theme.secondary_bg_color) r.setProperty("--tg-card", theme.secondary_bg_color);
    if (!initData) { setError("Open this from your Phoxta bot in Telegram."); return; }
    refresh();
  }, [initData, theme, refresh]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat, busy]);

  const send = async () => {
    const q = input.trim();
    if (!q || busy) return;
    setInput(""); setChat((c) => [...c, { role: "you", text: q }]); setBusy(true);
    try {
      const data = await call({ action: "chat", message: q });
      setChat((c) => [...c, { role: "operator", text: String(data.reply || "Done.") }]);
      if (Array.isArray(data.approvals)) setState((s) => (s ? { ...s, approvals: data.approvals } : s));
    } catch (e) {
      setChat((c) => [...c, { role: "operator", text: e instanceof Error ? e.message : String(e) }]);
    } finally { setBusy(false); }
  };

  const decide = async (id: string, decision: "approve" | "reject") => {
    setDeciding(id);
    try {
      const data = await call({ action: "decide", actionId: id, decision });
      if (Array.isArray(data.approvals)) setState((s) => (s ? { ...s, approvals: data.approvals } : s));
      if (data.status === "executed") setChat((c) => [...c, { role: "operator", text: `✓ Done. ${data.summary ?? ""}` }]);
      if (data.status === "failed") setChat((c) => [...c, { role: "operator", text: `⚠️ ${data.error ?? "That didn't go through."}` }]);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setDeciding(null); }
  };

  const cur = (n: number) => `${state?.org.currency ? state.org.currency + " " : ""}${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <div className="tgm">
      <style>{CSS}</style>
      <header className="tgm-head">
        <div className="tgm-dot" />
        <div>
          <div className="tgm-name">{state?.org.name ?? "Phoxta operator"}</div>
          <div className="tgm-sub">Operator console</div>
        </div>
      </header>

      {error && <div className="tgm-err">{error}</div>}

      {state && (
        <>
          <div className="tgm-stats">
            <div className="tgm-tile"><b>{state.stats.ordersToday}</b><span>orders today</span></div>
            <div className="tgm-tile"><b>{cur(state.stats.revenueToday)}</b><span>revenue today</span></div>
            <div className="tgm-tile"><b>{state.stats.pendingOrders}</b><span>to fulfil</span></div>
            <div className="tgm-tile"><b>{state.stats.openConversations}</b><span>open chats</span></div>
          </div>

          {state.approvals.length > 0 && (
            <section className="tgm-sec">
              <h2>Waiting for you</h2>
              {state.approvals.map((a) => (
                <div key={a.id} className="tgm-appr">
                  <p>{a.title}</p>
                  <div className="tgm-btns">
                    <button className="tgm-approve" disabled={deciding === a.id} onClick={() => decide(a.id, "approve")}>{deciding === a.id ? "…" : "Approve"}</button>
                    <button className="tgm-reject" disabled={deciding === a.id} onClick={() => decide(a.id, "reject")}>Reject</button>
                  </div>
                </div>
              ))}
            </section>
          )}
        </>
      )}

      <section className="tgm-chat">
        {chat.length === 0 && <p className="tgm-hint">Ask me anything — “what sold best this week”, “post about the sale”, “refund Amara's order”.</p>}
        {chat.map((l, i) => <div key={i} className={`tgm-line ${l.role}`}>{l.text}</div>)}
        {busy && <div className="tgm-line operator tgm-typing">…</div>}
        <div ref={endRef} />
      </section>

      <div className="tgm-compose">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="Tell the operator…" disabled={!state} />
        <button onClick={send} disabled={busy || !input.trim()}>Send</button>
      </div>
    </div>
  );
}

const CSS = `
:root{--tg-bg:#ffffff;--tg-text:#111;--tg-hint:#8a8f96;--tg-btn:#2AA3E0;--tg-btn-text:#fff;--tg-card:#f2f4f6}
*{box-sizing:border-box}
body{margin:0;background:var(--tg-bg)}
.tgm{min-height:100vh;background:var(--tg-bg);color:var(--tg-text);font-family:-apple-system,system-ui,"Segoe UI",Roboto,sans-serif;display:flex;flex-direction:column;max-width:640px;margin:0 auto;padding:12px 12px 88px}
.tgm-head{display:flex;align-items:center;gap:10px;padding:6px 2px 12px}
.tgm-dot{width:10px;height:10px;border-radius:50%;background:var(--tg-btn)}
.tgm-name{font-weight:700;font-size:17px}
.tgm-sub{font-size:12px;color:var(--tg-hint)}
.tgm-err{background:#fdecea;color:#a8231d;border-radius:10px;padding:10px 12px;font-size:14px;margin-bottom:10px}
.tgm-stats{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:14px}
.tgm-tile{background:var(--tg-card);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column}
.tgm-tile b{font-size:22px;line-height:1.1}
.tgm-tile span{font-size:12px;color:var(--tg-hint);margin-top:2px}
.tgm-sec h2{font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:var(--tg-hint);margin:0 0 8px}
.tgm-appr{background:var(--tg-card);border-radius:12px;padding:12px 14px;margin-bottom:8px}
.tgm-appr p{margin:0 0 10px;font-size:15px}
.tgm-btns{display:flex;gap:8px}
.tgm-btns button{flex:1;border:0;border-radius:9px;padding:9px;font-size:14px;font-weight:600;cursor:pointer}
.tgm-approve{background:var(--tg-btn);color:var(--tg-btn-text)}
.tgm-reject{background:transparent;color:var(--tg-hint);border:1px solid var(--tg-hint)!important}
.tgm-chat{margin-top:14px;display:flex;flex-direction:column;gap:8px;flex:1}
.tgm-hint{color:var(--tg-hint);font-size:14px;text-align:center;padding:20px 10px}
.tgm-line{max-width:85%;padding:9px 12px;border-radius:14px;font-size:15px;line-height:1.4;white-space:pre-wrap;word-wrap:break-word}
.tgm-line.you{align-self:flex-end;background:var(--tg-btn);color:var(--tg-btn-text);border-bottom-right-radius:5px}
.tgm-line.operator{align-self:flex-start;background:var(--tg-card);border-bottom-left-radius:5px}
.tgm-typing{opacity:.6;letter-spacing:2px}
.tgm-compose{position:fixed;bottom:0;left:0;right:0;max-width:640px;margin:0 auto;display:flex;gap:8px;padding:10px 12px;background:var(--tg-bg);border-top:1px solid var(--tg-card)}
.tgm-compose input{flex:1;border:1px solid var(--tg-card);background:var(--tg-card);color:var(--tg-text);border-radius:20px;padding:10px 14px;font-size:15px;outline:none}
.tgm-compose button{border:0;background:var(--tg-btn);color:var(--tg-btn-text);border-radius:20px;padding:10px 18px;font-weight:600;cursor:pointer}
.tgm-compose button:disabled{opacity:.5}
`;
