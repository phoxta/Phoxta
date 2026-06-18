import { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import type { OpsContext } from "@/layouts/OperatingLayout";
import {
    runOperator,
    listOperatorMessages,
    saveOperatorMessages,
    listActions,
    decideAction,
    listAudit,
    listToolPolicies,
    setToolPolicy,
    listMemory,
    addMemory,
    removeMemory,
    WRITE_TOOL_LABELS,
    type OperatorMsg,
    type AgentAction,
    type AuditEntry,
    type ToolPolicy,
    type MemoryNote,
} from "@/lib/db/ops/operator";

export default function OperatorPage() {
    const { orgId, org } = useOutletContext<OpsContext>();
    const [msgs, setMsgs] = useState<OperatorMsg[]>([
        { role: "assistant", content: `Hi — I'm your AI operator for ${org.name}. Ask about your data, or tell me what to change (e.g. "set the wool coat price to 290", "mark the latest order fulfilled", "draft a blog post about new arrivals").` },
    ]);
    const [draft, setDraft] = useState("");
    const [busy, setBusy] = useState(false);
    const [actions, setActions] = useState<AgentAction[]>([]);
    const [audit, setAudit] = useState<AuditEntry[]>([]);
    const [policies, setPolicies] = useState<ToolPolicy[]>([]);
    const [memory, setMemory] = useState<MemoryNote[]>([]);
    const [memDraft, setMemDraft] = useState("");
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

    async function decide(id: string, decision: "approve" | "reject") {
        await decideAction(id, decision);
        refresh();
    }
    const modeOf = (tool: string) => policies.find((p) => p.tool === tool)?.mode ?? "approve";
    async function changeMode(tool: string, mode: ToolPolicy["mode"]) {
        await setToolPolicy(orgId, tool, mode);
        refresh();
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
                    {error && <div className="px-4"><div className="alert alert-warning py-2 px-3 fz-font-sm mb-2">{error}</div></div>}
                    <form className="d-flex gap-2 p-3 border-top border-100" onSubmit={(e) => { e.preventDefault(); send(draft); }}>
                        <input className="form-control rounded-3" placeholder="Ask or instruct your operator…" value={draft} onChange={(e) => setDraft(e.target.value)} />
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
                            {pending.map((a) => (
                                <div key={a.id} className="border-100 rounded-3 p-3">
                                    <div className="fw-600 fz-font-md mb-2">{a.title}</div>
                                    <div className="d-flex gap-2">
                                        <button className="btn btn-dark btn-sm rounded-pill px-3" onClick={() => decide(a.id, "approve")}>Approve</button>
                                        <button className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none" onClick={() => decide(a.id, "reject")}>Reject</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-neutral-0 rounded-4 p-4 border-100">
                    <h6 className="fw-600 mb-3">What the operator may do</h6>
                    <div className="d-flex flex-column gap-2">
                        {Object.entries(WRITE_TOOL_LABELS).map(([tool, label]) => (
                            <div key={tool} className="d-flex align-items-center justify-content-between gap-2">
                                <span className="fz-font-md">{label}</span>
                                <select className="form-select form-select-sm rounded-3" style={{ width: "auto" }} value={modeOf(tool)} onChange={(e) => changeMode(tool, e.target.value as ToolPolicy["mode"])}>
                                    <option value="off">Off</option>
                                    <option value="approve">Ask me</option>
                                    <option value="auto">Auto</option>
                                </select>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-neutral-0 rounded-4 p-4 border-100">
                    <h6 className="fw-600 mb-3">Memory</h6>
                    <form className="d-flex gap-2 mb-2" onSubmit={(e) => { e.preventDefault(); if (memDraft.trim()) addMemory(orgId, memDraft.trim()).then(() => { setMemDraft(""); refresh(); }); }}>
                        <input className="form-control form-control-sm rounded-3" placeholder="Teach the agent something to remember…" value={memDraft} onChange={(e) => setMemDraft(e.target.value)} />
                        <button className="btn btn-dark btn-sm rounded-3 px-3" type="submit">Save</button>
                    </form>
                    {memory.length === 0 ? (
                        <p className="neutral-500 fz-font-sm mb-0">Nothing yet — the agent adds notes as you work, or add your own.</p>
                    ) : (
                        <ul className="list-unstyled m-0 d-flex flex-column gap-1">
                            {memory.slice(0, 8).map((m) => (
                                <li key={m.id} className="d-flex align-items-start justify-content-between gap-2 fz-font-sm">
                                    <span className="neutral-700">{m.title ? `${m.title}: ` : ""}{m.content}</span>
                                    <button className="btn btn-link btn-sm p-0 neutral-400 text-decoration-none" onClick={async () => { await removeMemory(m.id); refresh(); }}>×</button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="bg-neutral-0 rounded-4 p-4 border-100">
                    <h6 className="fw-600 mb-3">Recent activity</h6>
                    {audit.length === 0 ? (
                        <p className="neutral-500 fz-font-md mb-0">No activity yet.</p>
                    ) : (
                        <ul className="list-unstyled m-0 d-flex flex-column gap-2">
                            {audit.slice(0, 8).map((a) => (
                                <li key={a.id} className="fz-font-sm d-flex gap-2">
                                    <span className={`badge fw-500 ${a.status === "ok" ? "bg-success-subtle text-success" : a.status === "error" || a.status === "denied" ? "bg-warning-subtle text-warning" : "bg-neutral-100 neutral-700"}`} style={{ height: "fit-content" }}>{a.status}</span>
                                    <span className="neutral-700">{a.summary}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
