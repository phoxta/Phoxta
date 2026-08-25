import type { Edge, Node } from "reactflow";
import type { EngageEdge, EngageGraph, EngageNodeData, NodeType } from "@/lib/db/ops/engage";

// Mapping between the persisted contract graph (engage_flows.graph jsonb) and
// ReactFlow's canvas state. Serialisation strips everything ReactFlow adds
// (selection, measured dimensions) so only the contract shape reaches the DB.

/** The drag mime type a palette item writes and the canvas reads. */
export const DND_MIME = "application/phoxta-engage-node";

export function graphToCanvas(graph: EngageGraph): { nodes: Node<EngageNodeData>[]; edges: Edge[] } {
  return {
    nodes: graph.nodes.map((n) => ({ id: n.id, type: n.type, position: n.position, data: n.data })),
    edges: graph.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      ...(e.sourceHandle ? { sourceHandle: e.sourceHandle } : {}),
    })),
  };
}

export function canvasToGraph(nodes: Node<EngageNodeData>[], edges: Edge[]): EngageGraph {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      type: (n.type ?? "end") as NodeType,
      position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
      data: n.data ?? {},
    })),
    edges: edges.map((e): EngageEdge => ({
      id: e.id,
      source: e.source,
      target: e.target,
      ...(e.sourceHandle ? { sourceHandle: e.sourceHandle } : {}),
    })),
  };
}
