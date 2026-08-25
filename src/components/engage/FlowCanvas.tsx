import { useCallback, useMemo } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
  type OnEdgesChange,
  type OnNodesChange,
  type OnSelectionChangeParams,
  type XYPosition,
} from "reactflow";
import type { EngageNodeData, NodeType } from "@/lib/db/ops/engage";
import { ALL_NODE_TYPES, NODE_META, isTrigger, type NodeAccent } from "./nodeMeta";
import { DND_MIME } from "./graphMap";

// The Engage flow canvas: a ReactFlow wrapper whose nodes render as compact
// hrx cards (icon · title · one-line data summary). The AI handoff is blue,
// the human handoff orange — the two exits you should always be able to spot
// at a glance. Options/Condition nodes fan out through labelled source
// handles; everything else has one target (left) and one source (right).
// NOTE: the page that mounts this must import "reactflow/dist/style.css".
// Graph <-> canvas mapping lives in ./graphMap.

// ── the node card ────────────────────────────────────────────────────────────

function EngageNodeCard({ id, type, data, selected }: NodeProps<EngageNodeData>) {
  const t = type as NodeType;
  const meta = NODE_META[t];
  if (!meta) return <div className="fcx-node">{String(type)}</div>;

  // Labelled branch handles for the fan-out nodes.
  const branches: Array<{ handle: string; label: string }> | null =
    t === "buttons"
      ? [
          ...(data.options ?? []).map((o) => ({ handle: o.value, label: o.label || o.value || "option" })),
          { handle: "else", label: "No match" },
        ]
      : t === "condition"
        ? [
            { handle: "yes", label: "Yes" },
            { handle: "no", label: "No" },
          ]
        : null;

  const terminal = t === "handoff_ai" || t === "handoff_human" || t === "end";

  return (
    <div className={`fcx-node${meta.accent ? ` fcx-${meta.accent}` : ""}${selected ? " fcx-selected" : ""}`}>
      {!isTrigger(t) && <Handle type="target" position={Position.Left} id="in" className="fcx-handle" />}
      <div className="fcx-head">
        <span className="fcx-ico">{meta.icon}</span>
        <span className="fcx-title">{meta.label}</span>
      </div>
      <div className="fcx-sum">{meta.summary(data)}</div>
      {branches ? (
        <div className="fcx-branches">
          {branches.map((b) => (
            <div key={`${id}-${b.handle}`} className={`fcx-branch${b.handle === "else" ? " fcx-else" : ""}`}>
              <span className="fcx-branch-label">{b.label}</span>
              <Handle type="source" position={Position.Right} id={b.handle} className="fcx-handle" />
            </div>
          ))}
        </div>
      ) : (
        !terminal && <Handle type="source" position={Position.Right} id="out" className="fcx-handle" />
      )}
    </div>
  );
}

// One component for every contract node type; ReactFlow picks it via node.type.
// Module-level so the reference is stable across renders.
const NODE_TYPES: NodeTypes = Object.fromEntries(ALL_NODE_TYPES.map((t) => [t, EngageNodeCard])) as NodeTypes;

const ACCENT_COLOR: Record<NodeAccent, string> = {
  trigger: "#15803d",
  ai: "#2f6fed",
  human: "#e8632e",
  end: "#9ca3af",
};

const minimapColor = (n: Node): string => {
  const accent = NODE_META[(n.type ?? "end") as NodeType]?.accent;
  return accent ? ACCENT_COLOR[accent] : "#d1d5db";
};

const DEFAULT_EDGE_OPTIONS = {
  type: "smoothstep" as const,
  markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
};

const CSS = `
.fcx-flow { width: 100%; height: 100%; }
.fcx-flow .react-flow__attribution { opacity: 0.55; }
.fcx-node { width: 212px; background: var(--hrx-card, #fff); border: 1px solid var(--hrx-border-soft, #e5e7eb);
  border-radius: 14px; padding: 10px 12px 11px; font-size: 13px; color: var(--hrx-ink, #272727);
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.06); }
.fcx-node.fcx-selected { border-color: var(--hrx-ink, #272727); box-shadow: 0 0 0 2px rgba(39, 39, 39, 0.14); }
.fcx-node.fcx-trigger { border-left: 4px solid #15803d; }
.fcx-node.fcx-ai { border-left: 4px solid var(--hrx-blue, #2f6fed); background: #f5f8ff; }
.fcx-node.fcx-human { border-left: 4px solid var(--hrx-orange, #e8632e); background: #fff8f4; }
.fcx-node.fcx-end { border-left: 4px solid #d1d5db; }
.fcx-head { display: flex; align-items: center; gap: 7px; min-width: 0; }
.fcx-ico { display: inline-flex; flex-shrink: 0; color: var(--hrx-muted, #6b7280); }
.fcx-ai .fcx-ico { color: var(--hrx-blue, #2f6fed); }
.fcx-human .fcx-ico { color: var(--hrx-orange, #e8632e); }
.fcx-trigger .fcx-ico { color: #15803d; }
.fcx-title { font-weight: 600; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fcx-sum { margin-top: 3px; font-size: 11.5px; line-height: 1.35; color: var(--hrx-muted, #6b7280);
  overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.fcx-branches { margin: 8px -12px -11px; border-top: 1px solid var(--hrx-border-soft, #e5e7eb); }
.fcx-branch { position: relative; padding: 5px 14px 5px 12px; font-size: 11.5px; font-weight: 500;
  border-bottom: 1px solid var(--hrx-border-soft, #e5e7eb); }
.fcx-branch:last-child { border-bottom: 0; padding-bottom: 8px; }
.fcx-branch-label { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fcx-branch.fcx-else .fcx-branch-label { color: var(--hrx-muted, #6b7280); font-style: italic; font-weight: 400; }
.fcx-handle { width: 9px; height: 9px; background: #fff; border: 2px solid #9ca3af; }
.fcx-handle.react-flow__handle-connecting, .fcx-handle.react-flow__handle-valid { border-color: var(--hrx-blue, #2f6fed); }
.fcx-node.fcx-selected .fcx-handle { border-color: var(--hrx-ink, #272727); }
`;

// ── the canvas ───────────────────────────────────────────────────────────────

export default function FlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onSelectNode,
  onDropNode,
}: {
  nodes: Node<EngageNodeData>[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: (connection: Connection) => void;
  /** null when the selection clears (pane click). */
  onSelectNode: (id: string | null) => void;
  /** A palette item dropped onto the canvas, in flow coordinates. */
  onDropNode: (type: NodeType, position: XYPosition) => void;
}) {
  const rf = useReactFlow();

  const styledEdges = useMemo(() => edges.map((e) => ({ ...e, ...DEFAULT_EDGE_OPTIONS })), [edges]);

  const handleSelectionChange = useCallback(
    ({ nodes: sel }: OnSelectionChangeParams) => onSelectNode(sel[0]?.id ?? null),
    [onSelectNode],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(DND_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      const type = e.dataTransfer.getData(DND_MIME) as NodeType | "";
      if (!type) return;
      e.preventDefault();
      onDropNode(type, rf.screenToFlowPosition({ x: e.clientX, y: e.clientY }));
    },
    [onDropNode, rf],
  );

  // Double-clicking a wire deletes it — the quickest "no, not that way".
  const handleEdgeDoubleClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => onEdgesChange([{ id: edge.id, type: "remove" }]),
    [onEdgesChange],
  );

  return (
    <div className="fcx-flow" onDragOver={handleDragOver} onDrop={handleDrop}>
      <style>{CSS}</style>
      <ReactFlow
        nodes={nodes}
        edges={styledEdges}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={handleSelectionChange}
        onEdgeDoubleClick={handleEdgeDoubleClick}
        defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
        isValidConnection={(c) => c.source !== c.target}
        deleteKeyCode={["Backspace", "Delete"]}
        fitView
        fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
        snapToGrid
        snapGrid={[12, 12]}
        minZoom={0.3}
        maxZoom={1.75}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} color="#d8dbe1" />
        <MiniMap nodeColor={minimapColor} maskColor="rgba(246, 247, 249, 0.75)" pannable zoomable />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
