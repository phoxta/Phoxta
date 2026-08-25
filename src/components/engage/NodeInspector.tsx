import { useState, type ReactNode } from "react";
import type { ButtonOption, ConditionOp, EngageNode, EngageNodeData, TriggerEventName } from "@/lib/db/ops/engage";
import { EVENT_LABELS, NODE_META, humanizeMinutes } from "./nodeMeta";

// The right-hand panel of the flow editor: edits the selected node's data with
// proper controls per node type. Mount it with key={node.id} so drafts (the
// keyword being typed, etc.) reset when the selection moves.

const CSS = `
.nix { background: var(--hrx-card); border: 1px solid var(--hrx-border-soft); border-radius: 16px;
  padding: 14px; display: flex; flex-direction: column; gap: 2px; }
.nix-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.nix-head .ico { display: inline-flex; color: var(--hrx-muted); }
.nix-head h3 { font-size: 15px; font-weight: 600; margin: 0; flex: 1; min-width: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nix-x { border: 0; background: transparent; font-size: 18px; line-height: 1; color: var(--hrx-muted);
  cursor: pointer; padding: 2px 6px; border-radius: 8px; }
.nix-x:hover { background: var(--hrx-soft); color: var(--hrx-ink); }
.nix-hint { font-size: 12px; color: var(--hrx-muted); margin: 4px 0 10px; line-height: 1.4; }
.nix-static { font-size: 13px; color: var(--hrx-muted); line-height: 1.5; margin: 0 0 10px; }
.nix-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.nix-chip { display: inline-flex; align-items: center; gap: 5px; background: var(--hrx-soft);
  border: 1px solid var(--hrx-border-soft); border-radius: 999px; padding: 3px 6px 3px 11px;
  font-size: 12.5px; font-weight: 500; }
.nix-chip button { border: 0; background: transparent; color: var(--hrx-muted); cursor: pointer;
  font-size: 14px; line-height: 1; padding: 0 3px; border-radius: 999px; }
.nix-chip button:hover { color: #dc2626; }
.nix-opt { display: flex; gap: 6px; align-items: center; margin-bottom: 6px; }
.nix-opt .form-control { font-size: 13px; }
.nix-opt-x { border: 0; background: transparent; color: var(--hrx-muted); cursor: pointer;
  font-size: 16px; line-height: 1; padding: 4px; border-radius: 8px; flex-shrink: 0; }
.nix-opt-x:hover { color: #dc2626; background: var(--hrx-soft); }
.nix-add { align-self: flex-start; }
.nix-danger { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--hrx-border-soft); }
.nix-remove { border: 0; background: transparent; color: #dc2626; font-size: 13px; font-weight: 500;
  cursor: pointer; padding: 0; }
.nix-remove:hover { text-decoration: underline; }
`;

const MERGE_HINT = "Use {{name}} to insert the contact's name.";

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="hrx-field">
    <span>{label}</span>
    {children}
  </label>
);

export default function NodeInspector({
  node,
  onChange,
  onDelete,
  onClose,
}: {
  node: EngageNode;
  onChange: (data: EngageNodeData) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const meta = NODE_META[node.type];
  const d = node.data;
  const set = (patch: Partial<EngageNodeData>) => onChange({ ...d, ...patch });

  // Draft text for the keyword chips input (reset via key={node.id} on mount).
  const [keywordDraft, setKeywordDraft] = useState("");

  const addKeywords = (raw: string) => {
    const incoming = raw
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);
    if (incoming.length === 0) return;
    const merged = [...(d.keywords ?? [])];
    for (const k of incoming) if (!merged.includes(k)) merged.push(k);
    set({ keywords: merged });
    setKeywordDraft("");
  };

  const setOption = (i: number, patch: Partial<ButtonOption>) => {
    const options = (d.options ?? []).map((o, idx) => (idx === i ? { ...o, ...patch } : o));
    set({ options });
  };

  const body = (() => {
    switch (node.type) {
      case "trigger_keyword":
        return (
          <>
            <p className="nix-hint">Starts this flow when an incoming message contains any of these words.</p>
            {(d.keywords ?? []).length > 0 && (
              <div className="nix-chips">
                {(d.keywords ?? []).map((k) => (
                  <span key={k} className="nix-chip">
                    {k}
                    <button type="button" aria-label={`Remove keyword ${k}`} onClick={() => set({ keywords: (d.keywords ?? []).filter((x) => x !== k) })}>×</button>
                  </span>
                ))}
              </div>
            )}
            <Field label="Add keywords">
              <input
                className="form-control"
                placeholder="e.g. menu, price — press Enter"
                value={keywordDraft}
                onChange={(e) => setKeywordDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addKeywords(keywordDraft);
                  }
                }}
                onBlur={() => addKeywords(keywordDraft)}
              />
            </Field>
          </>
        );
      case "trigger_new_conversation":
        return <p className="nix-static">Starts this flow on every brand-new conversation, whatever the first message says. Nothing to configure.</p>;
      case "trigger_off_hours":
        return <p className="nix-static">Starts this flow when a message arrives outside your business hours. Nothing to configure — hours come from your Settings.</p>;
      case "trigger_event":
        return (
          <>
            <Field label="Event">
              <select
                className="form-select"
                value={d.event ?? "order_placed"}
                onChange={(e) => set({ event: e.target.value as TriggerEventName })}
              >
                {(Object.keys(EVENT_LABELS) as TriggerEventName[]).map((ev) => (
                  <option key={ev} value={ev}>{EVENT_LABELS[ev]}</option>
                ))}
              </select>
            </Field>
            {d.event === "contact_tagged" && (
              <Field label="Tag">
                <input className="form-control" placeholder="e.g. subscriber" value={d.tag ?? ""} onChange={(e) => set({ tag: e.target.value })} />
              </Field>
            )}
            <p className="nix-hint">Each contact enters this journey when the event fires for them.</p>
          </>
        );
      case "send_message":
        return (
          <>
            <Field label="Subject (email only)">
              <input className="form-control" placeholder="Optional — used when this sends as an email" value={d.subject ?? ""} onChange={(e) => set({ subject: e.target.value })} />
            </Field>
            <Field label="Message">
              <textarea className="form-control" rows={6} placeholder="What should we say?" value={d.text ?? ""} onChange={(e) => set({ text: e.target.value })} />
            </Field>
            <p className="nix-hint">{MERGE_HINT} Sends on the conversation's channel; journeys pick email or SMS per contact.</p>
          </>
        );
      case "buttons":
        return (
          <>
            <Field label="Question">
              <textarea className="form-control" rows={3} placeholder="e.g. What would you like to do?" value={d.text ?? ""} onChange={(e) => set({ text: e.target.value })} />
            </Field>
            <Field label="Options">
              <div>
                {(d.options ?? []).map((o, i) => (
                  <div key={i} className="nix-opt">
                    <input className="form-control" placeholder="Label shown to the customer" value={o.label} onChange={(e) => setOption(i, { label: e.target.value })} />
                    <input className="form-control" style={{ maxWidth: 110 }} placeholder="value" value={o.value} onChange={(e) => setOption(i, { value: e.target.value })} />
                    <button type="button" className="nix-opt-x" aria-label={`Remove option ${o.label || i + 1}`} onClick={() => set({ options: (d.options ?? []).filter((_, idx) => idx !== i) })}>×</button>
                  </div>
                ))}
              </div>
            </Field>
            <button
              type="button"
              className="hrx-pill nix-add"
              onClick={() => set({ options: [...(d.options ?? []), { label: "", value: `option-${(d.options?.length ?? 0) + 1}` }] })}
            >
              + Add option
            </button>
            <p className="nix-hint">Customers see a numbered list; each option is its own branch on the canvas, and replies that match nothing leave through "No match". Renaming an option's value detaches its wire.</p>
          </>
        );
      case "condition":
        return (
          <>
            <Field label="Check">
              <select className="form-select" value={d.op ?? "contains"} onChange={(e) => set({ op: e.target.value as ConditionOp })}>
                <option value="contains">Field contains</option>
                <option value="equals">Field equals</option>
                <option value="has_tag">Contact has tag</option>
                <option value="not_has_tag">Contact doesn't have tag</option>
              </select>
            </Field>
            {(d.op === "contains" || d.op === "equals" || !d.op) && (
              <Field label="Field">
                <input className="form-control" placeholder="e.g. last_message or email" value={d.field ?? ""} onChange={(e) => set({ field: e.target.value })} />
              </Field>
            )}
            <Field label={d.op === "has_tag" || d.op === "not_has_tag" ? "Tag" : "Value"}>
              <input className="form-control" placeholder={d.op === "has_tag" || d.op === "not_has_tag" ? "e.g. vip" : "What to look for"} value={d.value ?? ""} onChange={(e) => set({ value: e.target.value })} />
            </Field>
            <p className="nix-hint">The run continues through the Yes branch when the check passes, otherwise through No.</p>
          </>
        );
      case "collect_input":
        return (
          <>
            <Field label="Question">
              <textarea className="form-control" rows={3} placeholder="e.g. What's the best email to reach you on?" value={d.prompt ?? ""} onChange={(e) => set({ prompt: e.target.value })} />
            </Field>
            <Field label="Save the reply as">
              <input className="form-control" placeholder="e.g. email, phone, company" value={d.attribute ?? ""} onChange={(e) => set({ attribute: e.target.value })} />
            </Field>
            <p className="nix-hint">{MERGE_HINT} The reply is stored on the contact under this attribute.</p>
          </>
        );
      case "set_tag":
        return (
          <>
            <Field label="Tag">
              <input className="form-control" placeholder="e.g. after-hours-lead" value={d.tag ?? ""} onChange={(e) => set({ tag: e.target.value })} />
            </Field>
            <p className="nix-hint">Tags power segments, conditions and journey triggers.</p>
          </>
        );
      case "delay":
        return (
          <>
            <Field label="Wait (minutes)">
              <input
                type="number"
                min={1}
                className="form-control"
                value={d.minutes ?? 0}
                onChange={(e) => set({ minutes: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
              />
            </Field>
            <p className="nix-hint">{(d.minutes ?? 0) > 0 ? `That's ${humanizeMinutes(d.minutes ?? 0)}.` : "Set how long the run pauses."} 1440 ≈ 1 day, 10080 ≈ 1 week.</p>
          </>
        );
      case "handoff_ai":
        return <p className="nix-static">From here your AI agent takes over the conversation — it answers with your knowledge base and follows your agent policies. Nothing to configure.</p>;
      case "handoff_human":
        return (
          <>
            <Field label="Note for the teammate">
              <textarea className="form-control" rows={4} placeholder="Optional context, e.g. Customer mentioned a refund — lead with an apology." value={d.note ?? ""} onChange={(e) => set({ note: e.target.value })} />
            </Field>
            <p className="nix-hint">The conversation lands in the Inbox marked for a person, with this note attached.</p>
          </>
        );
      case "end":
        return <p className="nix-static">The run finishes cleanly here. Contacts can enter the flow again later.</p>;
      default:
        return null;
    }
  })();

  return (
    <aside className="nix" aria-label={`Edit ${meta.label} node`}>
      <style>{CSS}</style>
      <div className="nix-head">
        <span className="ico">{meta.icon}</span>
        <h3>{meta.label}</h3>
        <button type="button" className="nix-x" aria-label="Close inspector" onClick={onClose}>×</button>
      </div>
      {body}
      <div className="nix-danger">
        <button type="button" className="nix-remove" onClick={() => onDelete(node.id)}>Remove this node</button>
      </div>
    </aside>
  );
}
