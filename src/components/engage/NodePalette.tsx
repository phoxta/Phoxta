import type { FlowKind, NodeType } from "@/lib/db/ops/engage";
import { NODE_META, paletteGroups } from "./nodeMeta";
import { DND_MIME } from "./graphMap";

// The editor's left rail: every node the current kind can use, grouped.
// Click adds the node at the canvas centre; drag drops it exactly where you
// let go. Journeys see the event trigger, flows see the chat triggers — the
// shared steps (with the AI-agent node front and centre) are common to both.

const CSS = `
.npx { display: flex; flex-direction: column; gap: 14px; }
.npx-group-title { font-size: 11px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase;
  color: var(--hrx-muted); margin: 0 0 6px 2px; }
.npx-items { display: flex; flex-direction: column; gap: 6px; }
.npx-item { display: flex; align-items: flex-start; gap: 9px; width: 100%; text-align: left;
  background: var(--hrx-card); border: 1px solid var(--hrx-border-soft); border-radius: 12px;
  padding: 8px 10px; cursor: grab; transition: border-color 0.12s ease, background 0.12s ease; }
.npx-item:hover { border-color: var(--hrx-ink); background: var(--hrx-soft); }
.npx-item:active { cursor: grabbing; }
.npx-item .ico { display: inline-flex; flex-shrink: 0; margin-top: 2px; color: var(--hrx-muted); }
.npx-item.npx-ai .ico { color: var(--hrx-blue); }
.npx-item.npx-human .ico { color: var(--hrx-orange); }
.npx-item.npx-trigger .ico { color: #15803d; }
.npx-item .lbl { display: block; font-size: 13px; font-weight: 600; color: var(--hrx-ink); line-height: 1.25; }
.npx-item .sub { display: block; font-size: 11.5px; color: var(--hrx-muted); line-height: 1.3; margin-top: 1px; }
.npx-hint { font-size: 11.5px; color: var(--hrx-muted); margin: 0; }
`;

export default function NodePalette({ kind, onAdd }: { kind: FlowKind; onAdd: (type: NodeType) => void }) {
  return (
    <div className="npx" aria-label="Node palette">
      <style>{CSS}</style>
      <p className="npx-hint">Click a step to add it, or drag it onto the canvas.</p>
      {paletteGroups(kind).map(({ group, types }) => (
        <div key={group}>
          <h3 className="npx-group-title">{group}</h3>
          <div className="npx-items">
            {types.map((t) => {
              const meta = NODE_META[t];
              return (
                <button
                  key={t}
                  type="button"
                  className={`npx-item${meta.accent ? ` npx-${meta.accent}` : ""}`}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(DND_MIME, t);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => onAdd(t)}
                  title={`Add "${meta.label}"`}
                >
                  <span className="ico">{meta.icon}</span>
                  <span style={{ minWidth: 0 }}>
                    <span className="lbl">{meta.label}</span>
                    <span className="sub">{meta.blurb}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
