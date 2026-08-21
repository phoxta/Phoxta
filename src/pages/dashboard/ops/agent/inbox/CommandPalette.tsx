import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChannelIcon } from "@/pages/dashboard/ops/ui/primitives";
import { ENTER, MOD, channelLabel } from "@/pages/dashboard/ops/ui/util";
import { channelOf, nameOf, relTime, titleOf, type QueueItem } from "./queue";

/**
 * ⌘K / Ctrl+K palette.
 *
 * The console had eight actions spread across a header, a rail and two
 * dropdowns; the ones that apply to the open thread are now all reachable from
 * one place, alongside a jump-to-conversation search over the whole queue.
 *
 * Hand-rolled rather than cmdk: cmdk depends on @radix-ui/react-dialog for its
 * `Command.Dialog` export, which is not tree-shakeable and added ~30 kB gzip to
 * this chunk for a wrapper we don't use — the scrim, Escape handling and focus
 * containment here are ours.
 */

export type PaletteCommand = {
  id: string;
  label: string;
  group: string;
  icon?: ReactNode;
  hint?: string;
  run: () => void;
  disabled?: boolean;
};

type Row =
  | { kind: "heading"; id: string; label: string }
  | { kind: "command"; id: string; cmd: PaletteCommand }
  | { kind: "item"; id: string; item: QueueItem };

/** Plain substring, case-insensitive. */
const has = (haystack: string, needle: string) => !needle || haystack.toLowerCase().includes(needle);

/**
 * Subsequence match ("snz" → "Snooze"), used only as a fallback.
 *
 * On its own it is far too loose over prose: "sn" matched "Close conver**s**atio**n**"
 * and ranked it above the actual Snooze command. So commands try substrings
 * first and only fall back to this when nothing matched, and queue rows — whose
 * text is free-form message previews — never use it at all.
 */
function loosely(haystack: string, needle: string): boolean {
  if (!needle) return true;
  let i = 0;
  for (const ch of haystack.toLowerCase()) {
    if (ch === needle[i]) i++;
    if (i === needle.length) return true;
  }
  return false;
}

const ROW_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  textAlign: "left",
  border: 0,
  padding: "9px 10px",
  borderRadius: 9,
  fontSize: 13,
  color: "var(--at-neutral-800)",
  cursor: "pointer",
};

const HEADING_STYLE: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: ".05em",
  color: "var(--at-neutral-400)",
  padding: "9px 10px 5px",
};

const ICON_STYLE: React.CSSProperties = { display: "flex", flex: "0 0 15px", color: "var(--at-neutral-500)" };

export default function CommandPalette({
  open,
  onClose,
  items,
  commands,
  onOpenItem,
}: {
  open: boolean;
  onClose: () => void;
  items: QueueItem[];
  commands: PaletteCommand[];
  onOpenItem: (it: QueueItem) => void;
}) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
    }
  }, [open]);

  const rows = useMemo<Row[]>(() => {
    const needle = q.trim().toLowerCase();
    const out: Row[] = [];

    // Commands, grouped in declaration order. Substring first; only if that
    // finds nothing does the looser subsequence pass run.
    const live = commands.filter((c) => !c.disabled);
    let hits = live.filter((c) => has(`${c.label} ${c.group}`, needle));
    if (needle && hits.length === 0) hits = live.filter((c) => loosely(`${c.label} ${c.group}`, needle));
    let lastGroup = "";
    for (const c of hits) {
      if (c.group !== lastGroup) {
        out.push({ kind: "heading", id: `h:${c.group}`, label: c.group });
        lastGroup = c.group;
      }
      out.push({ kind: "command", id: `c:${c.id}`, cmd: c });
    }

    // Jumping is only useful once you've typed — an unfiltered dump of 500 rows
    // buries the actions, which are what the palette is mostly used for.
    if (needle) {
      const jump = items
        .filter((it) => has(`${nameOf(it)} ${titleOf(it)} ${channelLabel(channelOf(it))}`, needle))
        .slice(0, 25);
      if (jump.length) {
        out.push({ kind: "heading", id: "h:jump", label: "Jump to" });
        for (const it of jump) out.push({ kind: "item", id: `i:${it.kind}:${it.id}`, item: it });
      }
    }
    return out;
  }, [commands, items, q]);

  /** Indices of the rows that can actually be chosen (headings are skipped). */
  const selectable = useMemo(() => rows.map((r, i) => (r.kind === "heading" ? -1 : i)).filter((i) => i >= 0), [rows]);

  // Keep the highlight on a real row as the result set changes under it.
  useLayoutEffect(() => {
    if (selectable.length === 0) setActive(-1);
    else if (!selectable.includes(active)) setActive(selectable[0]);
  }, [selectable, active]);

  useLayoutEffect(() => {
    if (active < 0) return;
    listRef.current?.querySelector<HTMLElement>(`[data-row="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  const choose = (row: Row) => {
    onClose();
    if (row.kind === "command") row.cmd.run();
    else if (row.kind === "item") onOpenItem(row.item);
  };

  const move = (delta: number) => {
    if (selectable.length === 0) return;
    const at = selectable.indexOf(active);
    const next = at < 0 ? 0 : (at + delta + selectable.length) % selectable.length;
    setActive(selectable[next]);
  };

  return (
    <div
      className="ibx-pal__scrim"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="ibx-pal"
        role="dialog"
        aria-modal="true"
        aria-label="Inbox commands"
        onKeyDown={(e) => {
          switch (e.key) {
            case "Escape":
              e.preventDefault();
              e.stopPropagation();
              onClose();
              break;
            case "ArrowDown":
              e.preventDefault();
              move(1);
              break;
            case "ArrowUp":
              e.preventDefault();
              move(-1);
              break;
            case "Home":
              e.preventDefault();
              if (selectable.length) setActive(selectable[0]);
              break;
            case "End":
              e.preventDefault();
              if (selectable.length) setActive(selectable[selectable.length - 1]);
              break;
            case "Enter": {
              const row = rows[active];
              if (row && row.kind !== "heading") {
                e.preventDefault();
                choose(row);
              }
              break;
            }
            case "Tab":
              // Nothing else in here is focusable — keep focus in the field.
              e.preventDefault();
              break;
            default:
              break;
          }
        }}
      >
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search conversations, or run a command…"
          aria-label="Search conversations, or run a command"
          aria-controls="ibx-pal-list"
          aria-activedescendant={active >= 0 ? `ibx-pal-row-${active}` : undefined}
          role="combobox"
          aria-expanded="true"
          aria-autocomplete="list"
        />

        <div
          id="ibx-pal-list"
          role="listbox"
          aria-label="Results"
          ref={listRef}
          style={{ overflowY: "auto", overscrollBehavior: "contain", padding: 6, minHeight: 60 }}
        >
          {rows.length === 0 && (
            <div style={{ padding: "26px 16px", textAlign: "center", fontSize: 12.5, color: "var(--at-neutral-400)" }}>
              Nothing matches “{q}”.
            </div>
          )}

          {rows.map((row, i) => {
            if (row.kind === "heading")
              return (
                <div key={row.id} style={HEADING_STYLE}>
                  {row.label}
                </div>
              );

            const isActive = i === active;
            const style = { ...ROW_STYLE, background: isActive ? "var(--at-neutral-50)" : "transparent" };

            if (row.kind === "command")
              return (
                <button
                  key={row.id}
                  id={`ibx-pal-row-${i}`}
                  data-row={i}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  tabIndex={-1}
                  style={style}
                  onMouseMove={() => setActive(i)}
                  onClick={() => choose(row)}
                >
                  <span style={ICON_STYLE}>{row.cmd.icon}</span>
                  <span style={{ flex: "1 1 auto", minWidth: 0 }}>{row.cmd.label}</span>
                  {row.cmd.hint && <span className="oc-kbd">{row.cmd.hint}</span>}
                </button>
              );

            const it = row.item;
            return (
              <button
                key={row.id}
                id={`ibx-pal-row-${i}`}
                data-row={i}
                type="button"
                role="option"
                aria-selected={isActive}
                tabIndex={-1}
                style={style}
                onMouseMove={() => setActive(i)}
                onClick={() => choose(row)}
              >
                <span style={ICON_STYLE}>
                  <ChannelIcon channel={channelOf(it)} size={15} />
                </span>
                <span className="text-truncate" style={{ flex: "1 1 auto", minWidth: 0 }}>
                  <b>{nameOf(it)}</b>
                  {titleOf(it) && <span style={{ opacity: 0.7 }}> — {titleOf(it)}</span>}
                </span>
                <span className="oc-kbd">{relTime(it.at)}</span>
              </button>
            );
          })}
        </div>

        <div
          className="d-flex align-items-center gap-3 px-3 py-2"
          style={{ borderTop: "1px solid var(--at-neutral-100)", fontSize: 11, color: "var(--at-neutral-400)" }}
        >
          <span>
            <span className="oc-kbd">↑↓</span> navigate
          </span>
          <span>
            <span className="oc-kbd">{ENTER}</span> run
          </span>
          <span className="ms-auto">
            <span className="oc-kbd">{MOD} K</span> toggle
          </span>
        </div>
      </div>
    </div>
  );
}
