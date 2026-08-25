import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from "reactflow";
import "reactflow/dist/style.css";
import { Card, Chip } from "@/components/dash/Ui";
import {
  getFlow,
  updateFlow,
  type EngageFlow,
  type EngageNode,
  type EngageNodeData,
  type FlowKind,
  type NodeType,
} from "@/lib/db/ops/engage";
import FlowCanvas from "@/components/engage/FlowCanvas";
import { canvasToGraph, graphToCanvas } from "@/components/engage/graphMap";
import NodePalette from "@/components/engage/NodePalette";
import NodeInspector from "@/components/engage/NodeInspector";
import { NODE_META, allowedSourceHandles, validateGraph } from "@/components/engage/nodeMeta";
import { toastError, reportMutation } from "@/lib/ops/feedback";
import { useEngageOrg } from "@/components/engage/useEngageOrg";

// Engage → Flow/Journey editor. One line of chrome (name, kind, status, save,
// publish, back), then the workbench: palette (left, collapsible) · canvas
// (centre — in normal page flow, NOT sticky) · inspector (right, when a node
// is selected). Save persists the graph; Set live validates it first and
// publishes graph + status together, so what runs is always what you see.

const CSS = `
.fex-top { display: flex; align-items: center; gap: 8px; flex-wrap: nowrap; min-width: 0; margin-bottom: 12px; }
.fex-name { flex: 1; min-width: 60px; border: 1px solid transparent; border-radius: 10px; background: transparent;
  font-size: 18px; font-weight: 600; letter-spacing: -0.02em; color: var(--hrx-ink); padding: 4px 8px; }
.fex-name:hover { border-color: var(--hrx-border-soft); }
.fex-name:focus { outline: none; border-color: var(--hrx-ink); background: var(--hrx-card); }
.fex-body { display: flex; gap: 12px; align-items: stretch; }
.fex-palette { width: 248px; flex-shrink: 0; height: 70vh; min-height: 460px; overflow-y: auto; padding-right: 2px; }
.fex-canvas { flex: 1; min-width: 0; height: 70vh; min-height: 460px; position: relative;
  border: 1px solid var(--hrx-border-soft); border-radius: 16px; overflow: hidden; background: #f6f7f9; }
.fex-inspector { width: 312px; flex-shrink: 0; height: 70vh; min-height: 460px; overflow-y: auto; }
.fex-blank { position: absolute; inset: 0; display: grid; place-items: center; pointer-events: none; z-index: 4; }
.fex-blank div { text-align: center; color: var(--hrx-muted); font-size: 14px; max-width: 34ch; }
.fex-blank strong { display: block; color: var(--hrx-ink); font-size: 15px; margin-bottom: 4px; }
@media (max-width: 1199.98px) { .fex-palette { width: 210px; } .fex-inspector { width: 280px; } }
@media (max-width: 899.98px) {
  .fex-top { flex-wrap: wrap; }
  .fex-body { flex-direction: column; }
  .fex-palette { width: 100%; height: auto; min-height: 0; max-height: 40vh; order: 2; }
  .fex-canvas { width: 100%; height: 60vh; min-height: 380px; order: 1; }
  .fex-inspector { width: 100%; height: auto; min-height: 0; order: 3; }
}
`;

const makeId = () => `n-${Math.random().toString(36).slice(2, 10)}`;

function EditorInner() {
  const { orgId } = useEngageOrg();
  const { flowId } = useParams();
  const { pathname } = useLocation();
  const rf = useReactFlow();
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  const [row, setRow] = useState<EngageFlow | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(true);

  const [nodes, setNodes, onNodesChange] = useNodesState<EngageNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Kind before the row loads (drives the back link + palette): trust the URL.
  const kind: FlowKind = row?.kind ?? (pathname.includes("/journeys/") ? "journey" : "flow");
  const listLabel = kind === "journey" ? "Journeys" : "Flows";

  useEffect(() => {
    if (!orgId || !flowId) return;
    let active = true;
    setLoading(true);
    setLoadError(null);
    getFlow(orgId, flowId).then(({ data, error }) => {
      if (!active) return;
      setRow(data);
      setLoadError(error ?? (data ? null : "This automation doesn't exist any more."));
      if (data) {
        setName(data.name);
        const { nodes: ns, edges: es } = graphToCanvas(data.graph);
        setNodes(ns);
        setEdges(es);
        setDirty(false);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [orgId, flowId, setNodes, setEdges]);

  // ── graph mutations ─────────────────────────────────────────────────────────

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (changes.some((c) => c.type === "position" || c.type === "remove")) setDirty(true);
      onNodesChange(changes);
    },
    [onNodesChange],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (changes.some((c) => c.type === "remove")) setDirty(true);
      onEdgesChange(changes);
    },
    [onEdgesChange],
  );

  // One wire per outlet: connecting from a handle replaces its existing edge.
  const handleConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          connection,
          eds.filter((e) => !(e.source === connection.source && (e.sourceHandle ?? null) === (connection.sourceHandle ?? null))),
        ),
      );
      setDirty(true);
    },
    [setEdges],
  );

  const addNode = useCallback(
    (type: NodeType, position: { x: number; y: number }) => {
      const id = makeId();
      setNodes((ns) => [
        ...ns.map((n) => ({ ...n, selected: false })),
        { id, type, position, data: NODE_META[type].defaults(), selected: true },
      ]);
      setSelectedId(id);
      setDirty(true);
    },
    [setNodes],
  );

  /** Palette click: land the node at the visible centre of the canvas. */
  const addAtCenter = useCallback(
    (type: NodeType) => {
      const rect = canvasWrapRef.current?.getBoundingClientRect();
      const centre = rect
        ? rf.screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
        : { x: 0, y: 0 };
      // A light scatter so repeated clicks don't stack cards exactly on top of each other.
      addNode(type, { x: Math.round(centre.x - 106 + (Math.random() * 48 - 24)), y: Math.round(centre.y - 30 + (Math.random() * 48 - 24)) });
    },
    [addNode, rf],
  );

  const updateNodeData = useCallback(
    (id: string, type: NodeType, data: EngageNodeData) => {
      setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data } : n)));
      // Editing options / branch values can retire a sourceHandle — drop the
      // edges wired to handles that no longer exist so the graph stays honest.
      const allowed = allowedSourceHandles(type, data);
      if (allowed !== null) {
        setEdges((eds) => eds.filter((e) => e.source !== id || allowed.includes(e.sourceHandle ?? "")));
      }
      setDirty(true);
    },
    [setNodes, setEdges],
  );

  const deleteNode = useCallback(
    (id: string) => {
      setNodes((ns) => ns.filter((n) => n.id !== id));
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
      setSelectedId((s) => (s === id ? null : s));
      setDirty(true);
    },
    [setNodes, setEdges],
  );

  // ── persistence ─────────────────────────────────────────────────────────────

  const save = useCallback(async (): Promise<boolean> => {
    if (!flowId) return false;
    setSaving(true);
    const graph = canvasToGraph(nodes, edges);
    const ok = await reportMutation(updateFlow(flowId, { graph, name: name.trim() || "Untitled" }), "Saved");
    setSaving(false);
    if (ok) {
      setDirty(false);
      setRow((r) => (r ? { ...r, graph, name: name.trim() || "Untitled" } : r));
    }
    return ok;
  }, [flowId, nodes, edges, name]);

  const setLive = useCallback(async () => {
    if (!flowId) return;
    const graph = canvasToGraph(nodes, edges);
    const errors = validateGraph(graph, kind);
    if (errors.length > 0) {
      errors.slice(0, 4).forEach((e) => toastError(e));
      if (errors.length > 4) toastError(`…and ${errors.length - 4} more issues.`);
      return;
    }
    setSaving(true);
    const ok = await reportMutation(
      updateFlow(flowId, { graph, name: name.trim() || "Untitled", status: "live" }),
      kind === "journey" ? "Live — this journey now runs for real contacts." : "Live — this flow now answers real conversations.",
    );
    setSaving(false);
    if (ok) {
      setDirty(false);
      setRow((r) => (r ? { ...r, graph, status: "live" } : r));
    }
  }, [flowId, nodes, edges, name, kind]);

  const pause = useCallback(async () => {
    if (!flowId) return;
    const ok = await reportMutation(updateFlow(flowId, { status: "draft" }), "Paused — back to draft.");
    if (ok) setRow((r) => (r ? { ...r, status: "draft" } : r));
  }, [flowId]);

  // ── render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Card>
        <div className="text-center py-4" style={{ color: "#6b7280" }} role="status">Loading the canvas…</div>
      </Card>
    );
  }
  if (loadError || !row) {
    return (
      <Card>
        <div className="text-center py-4" role="alert">
          <div className="fw-semibold mb-2" style={{ color: "#dc2626" }}>Couldn't open this {kind}</div>
          <div className="mb-3" style={{ color: "#6b7280" }}>{loadError ?? "It may have been deleted."}</div>
          <Link to=".." relative="path" className="hrx-pill dark ops-tap">Back to {listLabel}</Link>
        </div>
      </Card>
    );
  }

  const selectedNode = nodes.find((n) => n.id === selectedId);
  const selected: EngageNode | null = selectedNode
    ? { id: selectedNode.id, type: (selectedNode.type ?? "end") as NodeType, position: selectedNode.position, data: selectedNode.data }
    : null;
  const live = row.status === "live";

  return (
    <div>
      <style>{CSS}</style>

      <div className="fex-top">
        <Link to=".." relative="path" className="hrx-pill ops-tap" aria-label={`Back to ${listLabel}`}>← {listLabel}</Link>
        <input
          className="fex-name"
          value={name}
          aria-label={`${kind === "journey" ? "Journey" : "Flow"} name`}
          onChange={(e) => {
            setName(e.target.value);
            setDirty(true);
          }}
        />
        <Chip tone="blue">{kind === "journey" ? "Journey" : "Flow"}</Chip>
        <Chip tone={live ? "ok" : "warn"}>{live ? "Live" : "Draft"}</Chip>
        <button type="button" className="hrx-pill ops-tap" aria-expanded={paletteOpen} onClick={() => setPaletteOpen((v) => !v)}>
          {paletteOpen ? "Hide steps" : "Steps"}
        </button>
        <button type="button" className="hrx-pill dark ops-tap" disabled={saving || !dirty} onClick={() => void save()}>
          {dirty ? "Save" : "Saved"}
        </button>
        {live ? (
          <button type="button" className="hrx-pill ops-tap" disabled={saving} onClick={() => void pause()}>Pause</button>
        ) : (
          <button type="button" className="hrx-pill primary ops-tap" disabled={saving} onClick={() => void setLive()}>Set live</button>
        )}
      </div>

      <div className="fex-body">
        {paletteOpen && (
          <div className="fex-palette">
            <NodePalette kind={kind} onAdd={addAtCenter} />
          </div>
        )}
        <div className="fex-canvas" ref={canvasWrapRef}>
          {nodes.length === 0 && (
            <div className="fex-blank">
              <div>
                <strong>An empty canvas</strong>
                Add a trigger from the steps list, then wire each card to the next. Your AI agent is a step like any other.
              </div>
            </div>
          )}
          <FlowCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
            onSelectNode={setSelectedId}
            onDropNode={(type, pos) => addNode(type, { x: Math.round(pos.x - 106), y: Math.round(pos.y - 20) })}
          />
        </div>
        {selected && (
          <div className="fex-inspector">
            <NodeInspector
              key={selected.id}
              node={selected}
              onChange={(data) => updateNodeData(selected.id, selected.type, data)}
              onDelete={deleteNode}
              onClose={() => setSelectedId(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** Engage → Flow/Journey editor (route: engage/flows/:flowId · engage/journeys/:flowId). */
export default function FlowEditorPage() {
  return (
    <ReactFlowProvider>
      <EditorInner />
    </ReactFlowProvider>
  );
}
