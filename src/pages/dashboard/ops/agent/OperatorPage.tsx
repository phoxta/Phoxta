import { useEffect, useRef, useState, type ReactNode } from "react";
import { useOutletContext } from "react-router-dom";
import type { OpsContext } from "@/layouts/OperatingLayout";
import { formatPrice } from "@/lib/db/marketplace";
import { toast, toastError, confirmDanger, reportMutation } from "@/lib/ops/feedback";
import {
    runOperator,
    listOperatorMessages,
    saveOperatorMessages,
    listActions,
    decideAction,
    updateActionArgs,
    listAudit,
    listToolPolicies,
    setToolPolicy,
    listMemory,
    addMemory,
    updateMemory,
    removeMemory,
    WRITE_TOOL_LABELS,
    WRITE_TOOL_GROUPS,
    type OperatorMsg,
    type AgentAction,
    type AuditEntry,
    type ToolPolicy,
    type MemoryNote,
} from "@/lib/db/ops/operator";

// deno-style loose arg bag — action args come from the agent as free-form JSON.
type Args = Record<string, unknown>;

const short = (s: unknown, n = 140): string => {
    const t = String(s ?? "");
    return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

// Message-ish tools the owner can edit before approving: tool → the arg field
// that holds the outgoing text. The edited text is written back onto the
// queued action's args before approval, so exactly what they saw gets sent.
const EDITABLE_FIELD: Record<string, string> = {
    send_message: "message",
    google_send_email: "body",
    reply_ticket: "body",
    add_contact_note: "note",
    create_ticket: "message",
};

/** "old → new" pair, with the current value struck through. */
function Diff({ before, after }: { before?: unknown; after: ReactNode }) {
    const has = before !== undefined && before !== null && String(before) !== "";
    return (
        <>
            {has && <><s className="neutral-400">{String(before)}</s>{" → "}</>}
            <span className="fw-600">{after}</span>
        </>
    );
}

/** Plain-English sentence for a known queued tool, using args.__before for the
 *  current values. Returns null for unknown tools (caller falls back to JSON). */
function humanSentence(a: AgentAction, currency: string): ReactNode | null {
    const args = (a.args ?? {}) as Args;
    const b = ((args.__before ?? {}) as Args);
    const money = (cents: number) => formatPrice(cents, currency);
    const name = (fallback: unknown) => String((b.name as string) ?? fallback ?? "");
    switch (a.tool) {
        case "update_product_price":
            return <>Change {name(args.product)}: <Diff before={b.price_cents != null ? money(Number(b.price_cents)) : undefined} after={money(Math.round(Number(args.price) * 100))} /></>;
        case "set_product_stock":
            return <>Set {name(args.product)} stock: <Diff before={b.stock} after={String(args.stock)} /></>;
        case "set_product_status":
            return <>Set {name(args.product)}: <Diff before={b.status} after={String(args.status)} /></>;
        case "set_order_status":
            return <>Order{b.customer_name ? ` for ${b.customer_name}` : ` ${short(args.order, 24)}`}: <Diff before={b.status} after={String(args.status)} /></>;
        case "fulfill_order":
            return <>Mark order {String(args.order_id).slice(0, 8)}{b.customer_name ? ` (${b.customer_name})` : ""}: <Diff before={b.fulfillment_status} after="fulfilled" /></>;
        case "set_reservation_status":
            return <>Reservation{b.customer_name ? ` for ${b.customer_name}` : ` ${String(args.reservation_id).slice(0, 8)}`}: <Diff before={b.status} after={String(args.status)} /></>;
        case "update_contact_stage":
            return <>Move {name(args.contact)}: <Diff before={b.stage} after={String(args.stage)} /></>;
        case "tag_contact": {
            const next = (Array.isArray(args.tags) ? args.tags : []).map(String).join(", ");
            const prev = Array.isArray(b.tags) && b.tags.length ? b.tags.map(String).join(", ") : undefined;
            return <>Tag {name(args.contact)}: <Diff before={prev} after={next || "(none)"} /></>;
        }
        case "set_invoice_status":
            return <>Invoice {String((b.number as string) ?? args.invoice)}: <Diff before={b.status} after={String(args.status)} /></>;
        case "set_booking_status":
            return <>Booking{b.customer_name ? ` for ${b.customer_name}` : ` ${short(args.booking, 24)}`}: <Diff before={b.status} after={String(args.status)} /></>;
        case "set_ticket_status":
            return <>Ticket "{String((b.subject as string) ?? args.ticket)}": <Diff before={b.status} after={String(args.status)} /></>;
        case "send_message":
            return <>Send {String(args.channel ?? "message").toUpperCase()} to {String(args.to)}: "{short(args.message)}"</>;
        case "google_send_email":
            return <>Email {String(args.to)} — "{String(args.subject ?? "")}": "{short(args.body)}"</>;
        case "reply_ticket":
            return <>Reply on ticket {short(args.ticket, 40)}: "{short(args.body)}"</>;
        case "add_contact_note":
            return <>Add note to {name(args.contact)}: "{short(args.note)}"</>;
        case "create_ticket":
            return <>Create ticket: {String(args.subject)} ({String(args.customer_name ?? "")})</>;
        case "create_product":
            return <>Create product "{String(args.name)}" at {money(Math.round(Number(args.price) * 100))}</>;
        case "create_invoice": {
            const items = Array.isArray(args.items) ? (args.items as Args[]) : [];
            const total = items.reduce((s, i) => s + Math.max(1, Math.round(Number(i.quantity ?? 1))) * Math.round(Number(i.unit_price ?? 0) * 100), 0);
            return <>Create invoice for {String(args.customer_name)}: {money(total)} ({items.length} line{items.length === 1 ? "" : "s"})</>;
        }
        case "create_booking":
            return <>Book {String(args.customer_name)} for {String(args.start_at)}{args.service ? ` (${String(args.service)})` : ""}</>;
        case "create_service":
            return <>Create service "{String(args.name)}"{args.price != null ? ` at ${money(Math.round(Number(args.price) * 100))}` : ""}</>;
        case "block_availability":
            return <>Block {String(args.product)}: {String(args.start_date)} – {String(args.end_date)}</>;
        case "create_blog_post":
            return <>Publish blog post "{String(args.title)}"</>;
        case "publish_page":
            return <>{b.title ? "Update" : "Publish"} page "{String(args.title)}"{b.title ? <> (replaces "{String(b.title)}")</> : null}</>;
        case "create_contact":
            return <>Add contact {String(args.name)}{args.email ? ` (${String(args.email)})` : ""}</>;
        case "create_campaign":
            return <>Create {String(args.channel ?? "email")} campaign "{String(args.name)}"</>;
        case "send_campaign":
            return <>Send campaign {short(args.campaign, 40)} to all contacts</>;
        case "place_call":
            return <>Call {String(args.to)}{args.opening ? <>: "{short(args.opening)}"</> : null}</>;
        case "add_location":
            return <>Add location "{String(args.name)}"</>;
        case "google_create_doc":
            return <>Create Google Doc "{String(args.title)}"</>;
        case "google_create_event":
            return <>Create calendar event "{String(args.summary)}" at {String(args.start)}</>;
        default:
            return null;
    }
}

const argsSummary = (args: Args | null): string => {
    if (!args) return "";
    const rest = { ...args };
    delete rest.__before;
    const keys = Object.keys(rest);
    if (keys.length === 0) return "";
    return short(keys.map((k) => `${k}: ${typeof rest[k] === "object" ? JSON.stringify(rest[k]) : String(rest[k])}`).join(" · "), 160);
};

export default function OperatorPage() {
    const { orgId, org } = useOutletContext<OpsContext>();
    const [msgs, setMsgs] = useState<OperatorMsg[]>([
        { role: "assistant", content: `Hi — I'm your AI operator for ${org.name}. Ask about your data, or tell me what to change (e.g. "set the wool coat price to 290", "mark the latest order fulfilled", "draft a blog post about new arrivals").` },
    ]);
    const [draft, setDraft] = useState("");
    const [busy, setBusy] = useState(false);
    const [actions, setActions] = useState<AgentAction[]>([]);
    const [audit, setAudit] = useState<AuditEntry[]>([]);
    const [auditAll, setAuditAll] = useState<AuditEntry[] | null>(null);
    const [policies, setPolicies] = useState<ToolPolicy[]>([]);
    const [memory, setMemory] = useState<MemoryNote[]>([]);
    const [memDraft, setMemDraft] = useState("");
    const [memEdit, setMemEdit] = useState<{ id: string; text: string } | null>(null);
    // Approve-with-edit drafts, keyed by action id (undefined = editor closed).
    const [editDrafts, setEditDrafts] = useState<Record<string, string>>({});
    const [deciding, setDeciding] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const bodyRef = useRef<HTMLDivElement>(null);

    async function refresh() {
        const [a, au, p, m] = await Promise.all([listActions(orgId), listAudit(orgId), listToolPolicies(orgId), listMemory(orgId)]);
        setActions(a.data);
        setAudit(au.data);
        setPolicies(p.data);
        setMemory(m.data);
    }
    useEffect(() => {
        refresh();
        listOperatorMessages(orgId).then(({ data }) => {
            if (data.length) {
                setMsgs(data);
                setTimeout(() => bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight }), 50);
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orgId]);

    // Queue liveness: actions can be queued from any channel (SMS, WhatsApp,
    // voice, automations) — poll every 30s and refresh on window focus so the
    // approvals pane never shows a stale queue.
    useEffect(() => {
        const tick = () => {
            listActions(orgId).then(({ data }) => setActions(data));
            listAudit(orgId).then(({ data }) => setAudit(data));
        };
        const iv = window.setInterval(tick, 30_000);
        const onFocus = () => tick();
        window.addEventListener("focus", onFocus);
        return () => {
            window.clearInterval(iv);
            window.removeEventListener("focus", onFocus);
        };
    }, [orgId]);

    async function send(text: string) {
        const q = text.trim();
        if (!q || busy) return;
        // History must start with a user turn — drop the leading greeting.
        let history = [...msgs];
        while (history.length && history[0].role === "assistant") history = history.slice(1);
        setMsgs((m) => [...m, { role: "user", content: q }]);
        setDraft("");
        setBusy(true);
        setError(null);
        const { reply, error } = await runOperator(orgId, q, history);
        setBusy(false);
        if (error) {
            setError(error);
            return;
        }
        setMsgs((m) => [...m, { role: "assistant", content: reply || "Done." }]);
        saveOperatorMessages(orgId, [{ role: "user", content: q }, { role: "assistant", content: reply || "Done." }]);
        refresh();
        setTimeout(() => bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" }), 50);
    }

    async function decide(a: AgentAction, decision: "approve" | "reject") {
        if (deciding) return;
        setDeciding(a.id);
        try {
            if (decision === "approve" && editDrafts[a.id] !== undefined && EDITABLE_FIELD[a.tool]) {
                // Approve-with-edit: persist the edited text onto the queued args
                // first so the approval executes exactly what the owner saw.
                const next = { ...(a.args ?? {}), [EDITABLE_FIELD[a.tool]]: editDrafts[a.id] };
                const ok = await reportMutation(updateActionArgs(a.id, next));
                if (!ok) return;
            }
            const { status, error } = await decideAction(a.id, decision);
            if (error) {
                toastError(error);
                return;
            }
            if (status === "failed") toastError("Approved, but the action failed — see Recent activity for details.");
            else toast(decision === "approve" ? "Approved — done." : "Rejected.");
            setEditDrafts((d) => {
                const n = { ...d };
                delete n[a.id];
                return n;
            });
        } finally {
            setDeciding(null);
            refresh();
        }
    }

    const modeOf = (tool: string) => policies.find((p) => p.tool === tool)?.mode ?? "approve";
    async function changeMode(tool: string, mode: ToolPolicy["mode"]) {
        await reportMutation(setToolPolicy(orgId, tool, mode), "Policy updated.");
        refresh();
    }

    async function forgetMemory(id: string) {
        if (!confirmDanger("Forget this note? The agent will no longer remember it.")) return;
        await reportMutation(removeMemory(id), "Forgotten.");
        refresh();
    }
    async function saveMemoryEdit() {
        if (!memEdit) return;
        const text = memEdit.text.trim();
        if (!text) {
            toastError("A memory note can't be empty — delete it instead.");
            return;
        }
        const ok = await reportMutation(updateMemory(memEdit.id, text), "Note updated.");
        if (ok) {
            setMemEdit(null);
            refresh();
        }
    }

    const pending = actions.filter((a) => a.status === "pending");

    return (
        <div className="row g-4">
            <div className="col-lg-7">
                <div className="bg-neutral-0 rounded-4 border-100 d-flex flex-column" style={{ height: 540 }}>
                    <div className="flex-grow-1 overflow-auto p-4 d-flex flex-column gap-2" ref={bodyRef}>
                        {msgs.map((m, i) => (
                            <div key={i} className={`fz-font-md ${m.role === "user" ? "align-self-end bg-neutral-900 text-white" : "align-self-start bg-neutral-100"}`} style={{ maxWidth: "85%", padding: "10px 14px", borderRadius: 12, whiteSpace: "pre-wrap" }}>
                                {m.content}
                            </div>
                        ))}
                        {busy && <div className="align-self-start bg-neutral-100 fz-font-md" style={{ padding: "10px 14px", borderRadius: 12 }}>…</div>}
                    </div>
                    {error && <div className="px-4"><div className="alert alert-danger py-2 px-3 fz-font-sm mb-2">{error}</div></div>}
                    <form className="d-flex gap-2 p-3 border-top border-100 align-items-end" onSubmit={(e) => { e.preventDefault(); send(draft); }}>
                        <textarea
                            className="form-control rounded-3"
                            aria-label="Message your operator"
                            placeholder="Ask or instruct your operator… (Enter to send, Shift+Enter for a new line)"
                            rows={draft.includes("\n") ? 3 : 1}
                            style={{ resize: "none" }}
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    send(draft);
                                }
                            }}
                        />
                        <button className="btn btn-dark rounded-3 px-4" disabled={busy}>{busy ? "…" : "Send"}</button>
                    </form>
                </div>
            </div>

            <div className="col-lg-5 d-flex flex-column gap-4">
                <div className="bg-neutral-0 rounded-4 p-4 border-100">
                    <h6 className="fw-600 mb-3">Pending approvals {pending.length > 0 && <span className="badge bg-warning-subtle text-warning">{pending.length}</span>}</h6>
                    {pending.length === 0 ? (
                        <p className="neutral-500 fz-font-md mb-0">Nothing waiting. Actions you've set to "Ask me" will appear here for approval.</p>
                    ) : (
                        <div className="d-flex flex-column gap-2">
                            {pending.map((a) => {
                                const sentence = humanSentence(a, org.currency || "USD");
                                const editable = EDITABLE_FIELD[a.tool];
                                const editing = editDrafts[a.id] !== undefined;
                                return (
                                    <div key={a.id} className="border-100 rounded-3 p-3">
                                        {sentence ? (
                                            <div className="fz-font-md mb-2">{sentence}</div>
                                        ) : (
                                            <>
                                                <div className="fw-600 fz-font-md mb-2">{a.title}</div>
                                                {a.args && Object.keys(a.args as Args).length > 0 && (
                                                    <details className="mb-2">
                                                        <summary className="fz-font-sm neutral-500" style={{ cursor: "pointer" }}>What exactly will change</summary>
                                                        <pre className="fz-font-sm bg-neutral-50 rounded-2 p-2 mt-1 mb-0" style={{ whiteSpace: "pre-wrap", maxHeight: 160, overflow: "auto" }}>
                                                            {JSON.stringify(a.args, null, 1)}
                                                        </pre>
                                                    </details>
                                                )}
                                            </>
                                        )}
                                        {editable && editing && (
                                            <div className="mb-2">
                                                <label className="fz-font-sm neutral-500 d-block mb-1" htmlFor={`edit-${a.id}`}>Edit the message before approving</label>
                                                <textarea
                                                    id={`edit-${a.id}`}
                                                    className="form-control form-control-sm rounded-3 fz-font-sm"
                                                    rows={4}
                                                    value={editDrafts[a.id]}
                                                    onChange={(e) => setEditDrafts((d) => ({ ...d, [a.id]: e.target.value }))}
                                                />
                                            </div>
                                        )}
                                        <div className="d-flex gap-2 align-items-center flex-wrap">
                                            <button className="btn btn-dark btn-sm rounded-pill px-3" disabled={deciding === a.id} onClick={() => decide(a, "approve")}>
                                                {deciding === a.id ? "…" : editing ? "Approve edited" : "Approve"}
                                            </button>
                                            {editable && !editing && (
                                                <button className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={() => setEditDrafts((d) => ({ ...d, [a.id]: String((a.args as Args)?.[editable] ?? "") }))}>
                                                    Edit first
                                                </button>
                                            )}
                                            {editable && editing && (
                                                <button className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={() => setEditDrafts((d) => { const n = { ...d }; delete n[a.id]; return n; })}>
                                                    Discard edit
                                                </button>
                                            )}
                                            <button className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" disabled={deciding === a.id} onClick={() => decide(a, "reject")}>Reject</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="bg-neutral-0 rounded-4 p-4 border-100">
                    <h6 className="fw-600 mb-1">What the operator may do</h6>
                    <p className="fz-font-sm neutral-500 mb-3">Off = blocked · Ask me = queued for your approval · Auto = runs immediately.</p>
                    <div className="d-flex flex-column gap-3">
                        {WRITE_TOOL_GROUPS.map((group) => (
                            <div key={group.label}>
                                <span className="d-block fz-font-sm fw-600 text-uppercase neutral-400 mb-2">{group.label}</span>
                                <div className="d-flex flex-column gap-2">
                                    {group.tools.map((tool) => (
                                        <div key={tool} className="d-flex align-items-center justify-content-between gap-2">
                                            <span className="fz-font-md">{WRITE_TOOL_LABELS[tool] ?? tool}</span>
                                            <select className="form-select form-select-sm rounded-3" style={{ width: "auto" }} aria-label={`Policy for ${WRITE_TOOL_LABELS[tool] ?? tool}`} value={modeOf(tool)} onChange={(e) => changeMode(tool, e.target.value as ToolPolicy["mode"])}>
                                                <option value="off">Off</option>
                                                <option value="approve">Ask me</option>
                                                <option value="auto">Auto</option>
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-neutral-0 rounded-4 p-4 border-100">
                    <h6 className="fw-600 mb-3">Memory</h6>
                    <form className="d-flex gap-2 mb-2" onSubmit={async (e) => { e.preventDefault(); const t = memDraft.trim(); if (!t) return; const ok = await reportMutation(addMemory(orgId, t), "Saved."); if (ok) { setMemDraft(""); refresh(); } }}>
                        <input className="form-control form-control-sm rounded-3" aria-label="New memory note" placeholder="Teach the agent something to remember…" value={memDraft} onChange={(e) => setMemDraft(e.target.value)} />
                        <button className="btn btn-dark btn-sm rounded-3 px-3" type="submit">Save</button>
                    </form>
                    {memory.length === 0 ? (
                        <p className="neutral-500 fz-font-sm mb-0">Nothing yet — the agent adds notes as you work, or add your own.</p>
                    ) : (
                        <ul className="list-unstyled m-0 d-flex flex-column gap-1">
                            {memory.slice(0, 8).map((m) => (
                                <li key={m.id} className="d-flex align-items-start justify-content-between gap-2 fz-font-sm">
                                    {memEdit?.id === m.id ? (
                                        <form className="d-flex gap-2 flex-grow-1" onSubmit={(e) => { e.preventDefault(); saveMemoryEdit(); }}>
                                            <input className="form-control form-control-sm rounded-3" aria-label="Edit memory note" value={memEdit.text} onChange={(e) => setMemEdit({ id: m.id, text: e.target.value })} autoFocus />
                                            <button className="btn btn-dark btn-sm rounded-3 px-2" type="submit">Save</button>
                                            <button className="btn btn-link btn-sm p-0 neutral-400 text-decoration-none" type="button" onClick={() => setMemEdit(null)}>Cancel</button>
                                        </form>
                                    ) : (
                                        <>
                                            <span className="neutral-700">{m.title ? `${m.title}: ` : ""}{m.content}</span>
                                            <span className="d-flex gap-2 flex-shrink-0">
                                                <button className="btn btn-link btn-sm p-0 neutral-400 text-decoration-none" aria-label="Edit note" onClick={() => setMemEdit({ id: m.id, text: m.content })}>Edit</button>
                                                <button className="btn btn-link btn-sm p-0 neutral-400 text-decoration-none" aria-label="Forget note" onClick={() => forgetMemory(m.id)}>×</button>
                                            </span>
                                        </>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="bg-neutral-0 rounded-4 p-4 border-100">
                    <div className="d-flex align-items-center justify-content-between mb-3">
                        <h6 className="fw-600 mb-0">Recent activity</h6>
                        {auditAll === null ? (
                            <button className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none fz-font-sm" onClick={async () => { const { data, error } = await listAudit(orgId, 100); if (error) { toastError(error); return; } setAuditAll(data); }}>View all</button>
                        ) : (
                            <button className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none fz-font-sm" onClick={() => setAuditAll(null)}>Collapse</button>
                        )}
                    </div>
                    {(auditAll ?? audit).length === 0 ? (
                        <p className="neutral-500 fz-font-md mb-0">No activity yet.</p>
                    ) : (
                        <ul className="list-unstyled m-0 d-flex flex-column gap-2" style={auditAll ? { maxHeight: 420, overflowY: "auto" } : undefined}>
                            {(auditAll ?? audit.slice(0, 8)).map((a) => (
                                <li key={a.id} className="fz-font-sm d-flex gap-2 align-items-start">
                                    <span className={`badge fw-500 ${a.status === "ok" ? "bg-success-subtle text-success" : a.status === "error" || a.status === "denied" ? "bg-danger-subtle text-danger" : "bg-neutral-100 neutral-700"}`} style={{ height: "fit-content" }}>{a.status}</span>
                                    <span className="d-flex flex-column">
                                        <span className="neutral-700">{a.summary}</span>
                                        <span className="neutral-400">
                                            {new Date(a.created_at).toLocaleString()} · {a.tool}
                                            {auditAll && argsSummary(a.args) ? ` · ${argsSummary(a.args)}` : ""}
                                        </span>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
