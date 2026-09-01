// Phoxta — Telegram Mini App: the operator console, launched inside the chat.
//
// Telegram opens this page in its own webview and puts the signed initData in the
// URL fragment (#tgWebAppData=…) with the theme. We read both from the fragment
// — no external SDK, so nothing to allow through the CSP — and send the initData
// to telegram-miniapp with every call, which re-validates the signature. The
// Supabase session isn't involved: identity is the Telegram signature. Four tabs
// (Home / Orders / Products / Chat) cover the core dashboard jobs, mobile-native.
// Reads are direct; every WRITE routes through the operator, so the off/approve/
// auto governance is never bypassed.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Approval = { id: string; title: string };
type Stats = { ordersToday: number; revenueToday: number; pendingOrders: number; openConversations: number };
type Org = { name: string; currency: string };
type Order = { id: string; customer: string; total: number; currency: string; status: string; fulfillment: string | null; at: string };
type Product = { id: string; name: string; price: number; currency: string; stock: number | null; status: string };
type ChatLine = { role: "you" | "operator"; text: string };
type Tab = "home" | "orders" | "products" | "chat";

const FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-miniapp`;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

function readFragment(): { initData: string; theme: Record<string, string> } {
  const frag = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  let theme: Record<string, string> = {};
  try { theme = JSON.parse(frag.get("tgWebAppThemeParams") ?? "{}"); } catch { /* default */ }
  return { initData: frag.get("tgWebAppData") ?? "", theme };
}

export default function TelegramMiniApp() {
  const { initData, theme } = useMemo(readFragment, []);
  const [tab, setTab] = useState<Tab>("home");
  const [org, setOrg] = useState<Org | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatLine[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
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

  const loadHome = useCallback(async () => {
    try { const d = await call({ action: "state" }); setOrg(d.org); setStats(d.stats); setApprovals(d.approvals ?? []); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }, [call]);
  const loadOrders = useCallback(async () => { try { setOrders((await call({ action: "orders" })).orders ?? []); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } }, [call]);
  const loadProducts = useCallback(async () => { try { setProducts((await call({ action: "products" })).products ?? []); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } }, [call]);

  useEffect(() => {
    const r = document.documentElement.style;
    const set = (k: string, v?: string) => v && r.setProperty(k, v);
    set("--tg-bg", theme.bg_color); set("--tg-text", theme.text_color); set("--tg-hint", theme.hint_color);
    set("--tg-btn", theme.button_color); set("--tg-btn-text", theme.button_text_color); set("--tg-card", theme.secondary_bg_color);
    if (!initData) { setError("Open this from your Phoxta bot in Telegram."); return; }
    loadHome();
  }, [initData, theme, loadHome]);

  useEffect(() => {
    if (tab === "orders" && orders === null) loadOrders();
    if (tab === "products" && products === null) loadProducts();
    if (tab === "chat") endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [tab, orders, products, loadOrders, loadProducts]);
  useEffect(() => { if (tab === "chat") endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat, busy, tab]);

  // A write, always through the operator (governance intact). Optionally jump to
  // Chat so the owner sees the operator's reply / any approval it queued.
  const instruct = async (message: string, opts?: { show?: boolean }) => {
    setActing(message); if (opts?.show) setTab("chat");
    setChat((c) => [...c, { role: "you", text: message }]); setBusy(true);
    try {
      const data = await call({ action: "chat", message });
      setChat((c) => [...c, { role: "operator", text: String(data.reply || "Done.") }]);
      if (Array.isArray(data.approvals)) setApprovals(data.approvals);
    } catch (e) { setChat((c) => [...c, { role: "operator", text: e instanceof Error ? e.message : String(e) }]); }
    finally { setBusy(false); setActing(null); loadHome(); if (tab === "orders") loadOrders(); }
  };

  const send = async () => { const q = input.trim(); if (!q || busy) return; setInput(""); await instruct(q); };

  const decide = async (id: string, decision: "approve" | "reject") => {
    setActing(id);
    try {
      const data = await call({ action: "decide", actionId: id, decision });
      if (Array.isArray(data.approvals)) setApprovals(data.approvals);
      if (data.status === "executed") setChat((c) => [...c, { role: "operator", text: `✓ Done. ${data.summary ?? ""}` }]);
      if (data.status === "failed") setChat((c) => [...c, { role: "operator", text: `⚠️ ${data.error ?? "That didn't go through."}` }]);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setActing(null); }
  };

  const cur = (n: number, c?: string) => `${c || org?.currency ? (c || org?.currency) + " " : ""}${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <div className="tgm">
      <style>{CSS}</style>
      <header className="tgm-head">
        <div className="tgm-dot" />
        <div><div className="tgm-name">{org?.name ?? "Phoxta operator"}</div><div className="tgm-sub">{tabLabel(tab)}</div></div>
      </header>

      {error && <div className="tgm-err">{error}</div>}

      <main className="tgm-main">
        {tab === "home" && (
          <>
            <div className="tgm-stats">
              <div className="tgm-tile"><b>{stats?.ordersToday ?? "—"}</b><span>orders today</span></div>
              <div className="tgm-tile"><b>{stats ? cur(stats.revenueToday) : "—"}</b><span>revenue today</span></div>
              <div className="tgm-tile"><b>{stats?.pendingOrders ?? "—"}</b><span>to fulfil</span></div>
              <div className="tgm-tile"><b>{stats?.openConversations ?? "—"}</b><span>open chats</span></div>
            </div>
            <section className="tgm-sec">
              <h2>Waiting for you {approvals.length > 0 && <span className="tgm-count">{approvals.length}</span>}</h2>
              {approvals.length === 0 && <p className="tgm-empty">Nothing needs approval right now.</p>}
              {approvals.map((a) => (
                <div key={a.id} className="tgm-appr">
                  <p>{a.title}</p>
                  <div className="tgm-btns">
                    <button className="tgm-approve" disabled={acting === a.id} onClick={() => decide(a.id, "approve")}>{acting === a.id ? "…" : "Approve"}</button>
                    <button className="tgm-reject" disabled={acting === a.id} onClick={() => decide(a.id, "reject")}>Reject</button>
                  </div>
                </div>
              ))}
            </section>
          </>
        )}

        {tab === "orders" && (
          <section className="tgm-sec">
            <div className="tgm-sechead"><h2>Recent orders</h2><button className="tgm-refresh" onClick={loadOrders}>Refresh</button></div>
            {orders === null && <p className="tgm-empty">Loading…</p>}
            {orders?.length === 0 && <p className="tgm-empty">No orders yet.</p>}
            {orders?.map((o) => (
              <div key={o.id} className="tgm-row">
                <div className="tgm-rowmain">
                  <div className="tgm-rowtitle">{o.customer}</div>
                  <div className="tgm-rowsub">{cur(o.total, o.currency)} · <span className={`tgm-badge s-${o.status}`}>{o.status}</span>{o.fulfillment ? ` · ${o.fulfillment}` : ""}</div>
                </div>
                {(o.status === "paid" && o.fulfillment !== "fulfilled") && (
                  <button className="tgm-mini" disabled={busy} onClick={() => instruct(`Fulfil order ${o.id} and tell the customer it's on the way.`, { show: true })}>Fulfil</button>
                )}
              </div>
            ))}
          </section>
        )}

        {tab === "products" && (
          <section className="tgm-sec">
            <div className="tgm-sechead"><h2>Products</h2><button className="tgm-refresh" onClick={loadProducts}>Refresh</button></div>
            {products === null && <p className="tgm-empty">Loading…</p>}
            {products?.length === 0 && <p className="tgm-empty">No products yet — ask the operator to add one.</p>}
            {products?.map((p) => (
              <div key={p.id} className="tgm-row">
                <div className="tgm-rowmain">
                  <div className="tgm-rowtitle">{p.name}</div>
                  <div className="tgm-rowsub">{cur(p.price, p.currency)}{p.stock !== null ? ` · ${p.stock} in stock` : ""} · <span className={`tgm-badge s-${p.status}`}>{p.status}</span></div>
                </div>
              </div>
            ))}
            <p className="tgm-hint" style={{ padding: "12px 4px 0" }}>To change a price or restock, just tell the operator in Chat — “restock {products?.[0]?.name ?? "the headwraps"} to 40”.</p>
          </section>
        )}

        {tab === "chat" && (
          <section className="tgm-chatwrap">
            {chat.length === 0 && <p className="tgm-hint">Ask me anything — “what sold best this week”, “post about the sale”, “refund Amara's order”.</p>}
            {chat.map((l, i) => <div key={i} className={`tgm-line ${l.role}`}>{l.text}</div>)}
            {busy && <div className="tgm-line operator tgm-typing">…</div>}
            <div ref={endRef} />
          </section>
        )}
      </main>

      {tab === "chat" && (
        <div className="tgm-compose">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} placeholder="Tell the operator…" disabled={!org} />
          <button onClick={send} disabled={busy || !input.trim()}>Send</button>
        </div>
      )}

      <nav className="tgm-tabs">
        {(["home", "orders", "products", "chat"] as Tab[]).map((t) => (
          <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>
            <span className="tgm-ico">{TAB_ICON[t]}</span>{tabLabel(t)}
            {t === "home" && approvals.length > 0 && <span className="tgm-pip" />}
          </button>
        ))}
      </nav>
    </div>
  );
}

const TAB_ICON: Record<Tab, string> = { home: "◫", orders: "▤", products: "▦", chat: "💬" };
function tabLabel(t: Tab): string { return t === "home" ? "Home" : t === "orders" ? "Orders" : t === "products" ? "Products" : "Chat"; }

const CSS = `
:root{--tg-bg:#ffffff;--tg-text:#111;--tg-hint:#8a8f96;--tg-btn:#2AA3E0;--tg-btn-text:#fff;--tg-card:#f2f4f6}
*{box-sizing:border-box}
body{margin:0;background:var(--tg-bg)}
.tgm{min-height:100vh;background:var(--tg-bg);color:var(--tg-text);font-family:-apple-system,system-ui,"Segoe UI",Roboto,sans-serif;display:flex;flex-direction:column;max-width:640px;margin:0 auto;padding:12px 12px 128px}
.tgm-head{display:flex;align-items:center;gap:10px;padding:6px 2px 12px}
.tgm-dot{width:10px;height:10px;border-radius:50%;background:var(--tg-btn)}
.tgm-name{font-weight:700;font-size:17px}
.tgm-sub{font-size:12px;color:var(--tg-hint)}
.tgm-err{background:#fdecea;color:#a8231d;border-radius:10px;padding:10px 12px;font-size:14px;margin-bottom:10px}
.tgm-main{flex:1;display:flex;flex-direction:column}
.tgm-stats{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:14px}
.tgm-tile{background:var(--tg-card);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column}
.tgm-tile b{font-size:22px;line-height:1.1}
.tgm-tile span{font-size:12px;color:var(--tg-hint);margin-top:2px}
.tgm-sec h2{font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:var(--tg-hint);margin:0 0 8px;display:flex;align-items:center;gap:8px}
.tgm-sechead{display:flex;align-items:center;justify-content:space-between}
.tgm-count{background:var(--tg-btn);color:var(--tg-btn-text);border-radius:20px;font-size:11px;padding:1px 8px}
.tgm-refresh{border:0;background:none;color:var(--tg-btn);font-size:13px;font-weight:600;cursor:pointer}
.tgm-empty{color:var(--tg-hint);font-size:14px;padding:6px 2px}
.tgm-appr{background:var(--tg-card);border-radius:12px;padding:12px 14px;margin-bottom:8px}
.tgm-appr p{margin:0 0 10px;font-size:15px}
.tgm-btns{display:flex;gap:8px}
.tgm-btns button{flex:1;border:0;border-radius:9px;padding:9px;font-size:14px;font-weight:600;cursor:pointer}
.tgm-approve{background:var(--tg-btn);color:var(--tg-btn-text)}
.tgm-reject{background:transparent;color:var(--tg-hint);border:1px solid var(--tg-hint)!important}
.tgm-row{background:var(--tg-card);border-radius:12px;padding:11px 14px;margin-bottom:7px;display:flex;align-items:center;gap:10px}
.tgm-rowmain{flex:1;min-width:0}
.tgm-rowtitle{font-size:15px;font-weight:600}
.tgm-rowsub{font-size:12.5px;color:var(--tg-hint);margin-top:2px}
.tgm-badge{text-transform:capitalize}
.tgm-badge.s-paid,.tgm-badge.s-active,.tgm-badge.s-fulfilled{color:#1f8b57}
.tgm-badge.s-pending{color:#b26b12}
.tgm-badge.s-cancelled,.tgm-badge.s-refunded{color:#a8322a}
.tgm-mini{border:0;background:var(--tg-btn);color:var(--tg-btn-text);border-radius:8px;padding:8px 12px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap}
.tgm-mini:disabled{opacity:.5}
.tgm-chatwrap{display:flex;flex-direction:column;gap:8px;flex:1}
.tgm-hint{color:var(--tg-hint);font-size:14px;text-align:center;padding:16px 10px}
.tgm-line{max-width:85%;padding:9px 12px;border-radius:14px;font-size:15px;line-height:1.4;white-space:pre-wrap;word-wrap:break-word}
.tgm-line.you{align-self:flex-end;background:var(--tg-btn);color:var(--tg-btn-text);border-bottom-right-radius:5px}
.tgm-line.operator{align-self:flex-start;background:var(--tg-card);border-bottom-left-radius:5px}
.tgm-typing{opacity:.6;letter-spacing:2px}
.tgm-compose{position:fixed;bottom:56px;left:0;right:0;max-width:640px;margin:0 auto;display:flex;gap:8px;padding:10px 12px;background:var(--tg-bg);border-top:1px solid var(--tg-card)}
.tgm-compose input{flex:1;border:1px solid var(--tg-card);background:var(--tg-card);color:var(--tg-text);border-radius:20px;padding:10px 14px;font-size:15px;outline:none}
.tgm-compose button{border:0;background:var(--tg-btn);color:var(--tg-btn-text);border-radius:20px;padding:10px 18px;font-weight:600;cursor:pointer}
.tgm-compose button:disabled{opacity:.5}
.tgm-tabs{position:fixed;bottom:0;left:0;right:0;max-width:640px;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);background:var(--tg-bg);border-top:1px solid var(--tg-card)}
.tgm-tabs button{position:relative;border:0;background:none;color:var(--tg-hint);font-size:11px;font-weight:600;padding:8px 4px 10px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px}
.tgm-tabs button.on{color:var(--tg-btn)}
.tgm-ico{font-size:18px;line-height:1}
.tgm-pip{position:absolute;top:6px;right:calc(50% - 16px);width:7px;height:7px;border-radius:50%;background:#e0483d}
`;
