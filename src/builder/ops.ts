import type { Data } from "@measured/puck";
import { getManifest } from "./registry";

/**
 * Page operations — the shared command vocabulary for editing a page document.
 *
 * Both the AI chat action and the conversational voice agent emit these (never a
 * whole document), and this module's `applyOps` is the single pure reducer that
 * applies them to a Puck `Data` tree. Keeping one tiny, explicit op set makes
 * AI/voice edits compact, deterministic, and easy to preview/undo.
 */
export type PageOp =
  | { op: "add_section"; type: string; props?: Record<string, unknown>; index?: number }
  | { op: "remove_section"; id?: string; index?: number }
  | { op: "move_section"; from: number; to: number }
  | { op: "set_field"; id?: string; index?: number; path: string; value: unknown }
  | { op: "set_layout"; props: Record<string, unknown> }
  // Universal content overrides (any section): edit the Nth text/image slot.
  | { op: "set_text"; id?: string; index?: number; slot: number; value: string }
  | { op: "set_image"; id?: string; index?: number; slot: number; value: string };

type Block = { type: string; props: Record<string, unknown> };

function genId(type: string): string {
  return `${type}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Resolve a block index from an op that may target by id or index. */
function indexOf(content: Block[], target: { id?: string; index?: number }): number {
  if (target.id != null) return content.findIndex((b) => b.props?.id === target.id);
  if (target.index != null) return target.index;
  return -1;
}

/** Set a (possibly nested) value by dot/array path, e.g. "slides.0.src". */
function setPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split(".");
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const nextIsIndex = /^\d+$/.test(keys[i + 1]);
    if (cur[key] == null || typeof cur[key] !== "object") {
      cur[key] = nextIsIndex ? [] : {};
    }
    cur = cur[key] as Record<string, unknown>;
  }
  cur[keys[keys.length - 1]] = value;
}

/**
 * Apply a list of operations to a document, returning a new document.
 * Pure: deep-clones the input so callers can diff/undo. Unknown or
 * out-of-range ops are skipped rather than throwing, so a partially-valid AI
 * response still applies what it can.
 */
export function applyOps(doc: Data, ops: PageOp[]): Data {
  const next = structuredClone(doc) as Data & { content: Block[]; root: { props?: Record<string, unknown> } };
  next.content ??= [];
  next.root ??= { props: {} };
  next.root.props ??= {};

  for (const op of ops) {
    switch (op.op) {
      case "add_section": {
        if (!getManifest(op.type)) break; // never insert an unknown component
        const defaults = getManifest(op.type)?.defaultProps ?? {};
        const block: Block = {
          type: op.type,
          props: { ...defaults, ...(op.props ?? {}), id: genId(op.type) },
        };
        const at = op.index ?? next.content.length;
        next.content.splice(Math.max(0, Math.min(at, next.content.length)), 0, block);
        break;
      }
      case "remove_section": {
        const i = indexOf(next.content, op);
        if (i >= 0) next.content.splice(i, 1);
        break;
      }
      case "move_section": {
        const { from, to } = op;
        if (from < 0 || from >= next.content.length) break;
        const [moved] = next.content.splice(from, 1);
        next.content.splice(Math.max(0, Math.min(to, next.content.length)), 0, moved);
        break;
      }
      case "set_field": {
        const i = indexOf(next.content, op);
        if (i >= 0) setPath(next.content[i].props, op.path, op.value);
        break;
      }
      case "set_layout": {
        Object.assign(next.root.props!, op.props);
        break;
      }
      case "set_text":
      case "set_image": {
        const i = indexOf(next.content, op);
        if (i < 0) break;
        const props = next.content[i].props as Record<string, unknown> & { _edits?: { text?: Record<string, string>; img?: Record<string, string> } };
        const edits = (props._edits ??= {});
        const bucket = op.op === "set_text" ? (edits.text ??= {}) : (edits.img ??= {});
        bucket[String(op.slot)] = op.value;
        break;
      }
    }
  }

  return next;
}
