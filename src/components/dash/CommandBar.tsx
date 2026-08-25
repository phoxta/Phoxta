import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL, organizationsQuery } from "@/lib/cache/dashboardQueries";
import { consoleTabs, resolveConsole } from "@/lib/ops/consoleConfig";
import { LAST_ORG_KEY } from "@/pages/dashboard/ConsolePage";

/**
 * The dashboard command bar (Ctrl+K / Cmd+K) — one keystroke to any page,
 * business console, console tab, or quick action. Mounted once by
 * DashboardLayout, which owns the open state and the global shortcut; the
 * shell already locks body scroll, so the overlay only has to paint.
 *
 * The entry list is built from the same sources the shell navigates by:
 * the (already platform-gated) NAV items passed down as a prop, the user's
 * organizations from the shared warmed cache, and the last-worked-in
 * business's console tabs derived from consoleConfig — so the bar can never
 * offer a destination the nav wouldn't.
 */

type CommandNavItem = { to: string; label: string };

type Props = {
  open: boolean;
  onClose: () => void;
  /** The shell's nav items, already filtered by platformAdmin gating. */
  navItems: CommandNavItem[];
  platformAdmin: boolean;
};

type Entry = {
  id: string;
  group: string;
  label: string;
  /** Muted secondary text (e.g. which business a console tab belongs to). */
  hint?: string;
  to: string;
  icon: ReactNode;
  /** Extra text the filter may match when the label doesn't. */
  keywords?: string;
};

type Row = Entry & { hl: number[] };

const SETTINGS_PATH = "/dashboard/settings";
const RECENT_KEY = "phoxta:cbx:recent";
const GROUP_ORDER = ["Recent", "Go to", "Businesses", "Console", "Actions"];

/* ---------- icons (the shell's 1.5-stroke 20-box family) ---------- */

const svgProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

const SEARCH_ICON = (
  <svg {...svgProps} width={18} height={18}>
    <path d="M14.5 14.5a6.8 6.8 0 1 0-9.6-9.6 6.8 6.8 0 0 0 9.6 9.6Zm0 0 2.6 2.6" />
  </svg>
);

/** Go to — an arrow heading somewhere. */
const GO_ICON = (
  <svg {...svgProps}>
    <path d="M4 10h11.5M11 4.5l5 5.5-5 5.5" />
  </svg>
);

/** Open a console — the console's grid of modules. */
const CONSOLE_ICON = (
  <svg {...svgProps}>
    <rect x="3" y="3" width="6" height="6" rx="1.6" />
    <rect x="11" y="3" width="6" height="6" rx="1.6" />
    <rect x="3" y="11" width="6" height="6" rx="1.6" />
    <rect x="11" y="11" width="6" height="6" rx="1.6" />
  </svg>
);

/** Manage a business — a briefcase. */
const BIZ_ICON = (
  <svg {...svgProps}>
    <rect x="3" y="6.5" width="14" height="9.5" rx="2" />
    <path d="M7.5 6.5V5.2a1.7 1.7 0 0 1 1.7-1.7h1.6a1.7 1.7 0 0 1 1.7 1.7v1.3M3 10.5h14" />
  </svg>
);

/** A console tab — one pane of the console. */
const TAB_ICON = (
  <svg {...svgProps}>
    <rect x="3" y="3.5" width="14" height="13" rx="2" />
    <path d="M3 7.5h14M7.5 7.5V16.5" />
  </svg>
);

/** Write — a pen. */
const PEN_ICON = (
  <svg {...svgProps}>
    <path d="m12.9 3.6 3.5 3.5L7 16.5l-4.4 1 .9-4.5L12.9 3.6Z" />
  </svg>
);

/** New — a plus. */
const PLUS_ICON = (
  <svg {...svgProps}>
    <path d="M10 4.5v11M4.5 10h11" />
  </svg>
);

/** Recent — a clock. */
const RECENT_ICON = (
  <svg {...svgProps}>
    <circle cx="10" cy="10" r="7" />
    <path d="M10 6.2v3.8l2.5 1.6" />
  </svg>
);

/* ---------- matching ---------- */

/**
 * Where `query` matches inside `text`: a contiguous run when it appears as a
 * substring, otherwise an in-order character subsequence (spaces in the query
 * ignored). Returns the matched character indices for highlighting, or null
 * for no match. An empty query matches everything with nothing highlighted.
 */
function matchPositions(text: string, query: string): number[] | null {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const t = text.toLowerCase();
  const at = t.indexOf(q);
  if (at >= 0) return Array.from({ length: q.length }, (_, i) => at + i);
  const pos: number[] = [];
  let from = 0;
  for (const ch of q) {
    if (ch === " ") continue;
    const i = t.indexOf(ch, from);
    if (i === -1) return null;
    pos.push(i);
    from = i + 1;
  }
  return pos;
}

/** The label with its matched characters wrapped in <mark>. */
function highlight(label: string, pos: number[]): ReactNode {
  if (pos.length === 0) return label;
  const set = new Set(pos);
  const out: ReactNode[] = [];
  let run = "";
  let runHl = set.has(0);
  for (let i = 0; i < label.length; i++) {
    const hl = set.has(i);
    if (hl !== runHl) {
      out.push(runHl ? <mark key={i}>{run}</mark> : run);
      run = "";
      runHl = hl;
    }
    run += label[i];
  }
  out.push(runHl ? <mark key="tail">{run}</mark> : run);
  return out;
}

/** The last-worked-in business, as OperatingLayout records it. */
function readLastOrg(): string | null {
  try {
    return localStorage.getItem(LAST_ORG_KEY);
  } catch {
    return null;
  }
}

function readRecents(): string[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string").slice(0, 5) : [];
  } catch {
    return [];
  }
}

/* ---------- styles (page-local, cbx- prefixed — house pattern) ---------- */

const CSS = `
.cbx-veil { position: fixed; inset: 0; z-index: 1090; width: 100%; border: 0; margin: 0; padding: 0; cursor: default; background: rgba(39, 39, 39, 0.28); backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px); }
.cbx-wrap { position: fixed; inset: 0; z-index: 1091; display: flex; align-items: flex-start; justify-content: center; padding: clamp(48px, 14vh, 140px) 16px 16px; pointer-events: none; }
.cbx-panel { pointer-events: auto; width: 100%; max-width: 560px; display: flex; flex-direction: column; overflow: hidden; background: var(--hrx-card, #fff); border: 1px solid var(--hrx-border-soft, #ededed); border-radius: 16px; box-shadow: 0 24px 70px rgba(18, 27, 45, 0.22), 0 4px 14px rgba(18, 27, 45, 0.1); font-family: "Figtree", "DM Sans", sans-serif; }
.cbx-inputrow { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-bottom: 1px solid var(--hrx-border-soft, #ededed); color: var(--hrx-muted, #6b7280); }
.cbx-inputrow input { flex: 1; min-width: 0; border: 0; outline: none; background: transparent; font-size: 16px; letter-spacing: -0.01em; color: var(--hrx-ink, #272727); }
.cbx-inputrow input::placeholder { color: var(--hrx-muted, #6b7280); }
.cbx-list { max-height: min(52vh, 420px); overflow-y: auto; padding: 6px 8px 10px; }
.cbx-group { padding: 10px 10px 4px; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--hrx-muted, #6b7280); }
.cbx-opt { display: flex; align-items: center; gap: 12px; padding: 9px 10px; border-radius: 12px; cursor: pointer; color: var(--hrx-ink, #272727); }
.cbx-opt.sel { background: #eaf1fe; }
.cbx-ic { width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; background: var(--hrx-soft, #f9fbfc); border: 1px solid var(--hrx-border-soft, #ededed); color: var(--hrx-muted, #6b7280); }
.cbx-opt.sel .cbx-ic { background: #fff; border-color: #d7e3fb; color: var(--hrx-blue, #195ce5); }
.cbx-t { flex: 1; min-width: 0; display: flex; align-items: baseline; gap: 8px; }
.cbx-label { font-size: 15px; font-weight: 500; letter-spacing: -0.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cbx-label mark { background: transparent; padding: 0; color: var(--hrx-blue, #195ce5); font-weight: 700; }
.cbx-hint { font-size: 12.5px; color: var(--hrx-muted, #6b7280); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cbx-enter { font-size: 12px; color: var(--hrx-muted, #6b7280); opacity: 0; }
.cbx-opt.sel .cbx-enter { opacity: 1; }
.cbx-empty { padding: 28px 16px; text-align: center; font-size: 14px; color: var(--hrx-muted, #6b7280); }
.cbx-foot { display: flex; align-items: center; justify-content: flex-end; gap: 14px; padding: 9px 16px; border-top: 1px solid var(--hrx-border-soft, #ededed); background: var(--hrx-soft, #f9fbfc); color: var(--hrx-muted, #6b7280); font-size: 12px; }
.cbx-foot span { display: inline-flex; align-items: center; gap: 5px; }
.cbx-kbd { display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 20px; padding: 0 5px; border-radius: 6px; border: 1px solid var(--hrx-border-soft, #ededed); background: #fff; font-family: inherit; font-size: 11px; color: var(--hrx-ink, #272727); }
`;

export default function CommandBar({ open, onClose, navItems, platformAdmin }: Props) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);
  const [recents, setRecents] = useState<string[]>([]);
  const [lastOrgId, setLastOrgId] = useState<string | null>(readLastOrg);
  // Same shared cache entry the shell warms on sign-in, so this is normally
  // already populated by the time the bar first opens.
  const { data: orgs = [] } = useCachedData(organizationsQuery.key, organizationsQuery.fetch, {
    ttl: DASHBOARD_TTL,
  });

  // Everything the bar can do. Rebuilt per open so the "Console" group follows
  // LAST_ORG_KEY as the user moves between businesses.
  const entries = useMemo<Entry[]>(() => {
    const list: Entry[] = [];

    for (const item of navItems) {
      list.push({ id: `go:${item.to}`, group: "Go to", label: item.label, to: item.to, icon: GO_ICON });
    }
    list.push({ id: `go:${SETTINGS_PATH}`, group: "Go to", label: "Settings", to: SETTINGS_PATH, icon: GO_ICON });

    for (const { organization: o } of orgs) {
      list.push({
        id: `biz:${o.id}:console`,
        group: "Businesses",
        label: `Open ${o.name} console`,
        to: `/dashboard/businesses/${o.id}/ops`,
        icon: CONSOLE_ICON,
        keywords: o.vertical ?? undefined,
      });
      list.push({
        id: `biz:${o.id}:manage`,
        group: "Businesses",
        label: `Manage ${o.name}`,
        to: `/dashboard/businesses/${o.id}`,
        icon: BIZ_ICON,
        keywords: o.vertical ?? undefined,
      });
    }

    // Direct jumps into the last-worked-in business's console tabs, derived
    // from its vertical via consoleConfig — the exact tabs OperatingLayout
    // would render. Falls back to the first business when none is remembered.
    const consoleOrg = orgs.find((m) => m.organization.id === lastOrgId)?.organization ?? orgs[0]?.organization;
    if (consoleOrg) {
      const base = `/dashboard/businesses/${consoleOrg.id}/ops`;
      for (const t of consoleTabs(resolveConsole(consoleOrg.vertical))) {
        list.push({
          id: `console:${t.seg || "overview"}`,
          group: "Console",
          label: t.label,
          hint: consoleOrg.name,
          to: t.seg ? `${base}/${t.seg}` : base,
          icon: TAB_ICON,
          keywords: `console ${consoleOrg.name}`,
        });
      }
    }

    if (platformAdmin) {
      list.push({
        id: "act:blog",
        group: "Actions",
        label: "Write a blog post",
        to: "/dashboard/platform?section=Blog",
        icon: PEN_ICON,
      });
    }
    list.push({
      id: "act:new-business",
      group: "Actions",
      label: "New business",
      hint: "Browse the marketplace",
      to: "/dashboard/marketplace",
      icon: PLUS_ICON,
    });

    return list;
  }, [navItems, orgs, platformAdmin, lastOrgId]);

  // Grouped, filtered rows. Empty query = the full menu with recents floated
  // to the top; a query keeps only matching entries (empty groups vanish).
  const sections = useMemo(() => {
    const byGroup = new Map<string, Row[]>();
    const put = (group: string, row: Row) => {
      const arr = byGroup.get(group);
      if (arr) arr.push(row);
      else byGroup.set(group, [row]);
    };
    const q = query.trim();
    if (!q) {
      for (const id of recents) {
        const e = entries.find((x) => x.id === id);
        if (e) put("Recent", { ...e, icon: RECENT_ICON, hl: [] });
      }
      for (const e of entries) put(e.group, { ...e, hl: [] });
    } else {
      for (const e of entries) {
        let hl = matchPositions(e.label, q);
        if (!hl && matchPositions(`${e.hint ?? ""} ${e.keywords ?? ""}`, q)) hl = [];
        if (hl) put(e.group, { ...e, hl });
      }
    }
    return GROUP_ORDER.filter((g) => byGroup.has(g)).map((g) => ({ group: g, items: byGroup.get(g)! }));
  }, [entries, query, recents]);

  const flat = useMemo(() => sections.flatMap((s) => s.items), [sections]);
  // Where each section starts in the flat list — options are numbered flatly
  // so ↑/↓ glide straight across section boundaries.
  const offsets = useMemo(() => {
    const out: number[] = [];
    let acc = 0;
    for (const s of sections) {
      out.push(acc);
      acc += s.items.length;
    }
    return out;
  }, [sections]);
  const selIdx = Math.min(sel, Math.max(flat.length - 1, 0));

  // Fresh slate every opening: clear the query, re-read the remembered
  // business + recents from storage, focus the input.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSel(0);
    setRecents(readRecents());
    setLastOrgId(readLastOrg());
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  // Keep the keyboard selection visible as it moves through a long list.
  useEffect(() => {
    listRef.current?.querySelector(`#cbx-opt-${selIdx}`)?.scrollIntoView({ block: "nearest" });
  }, [selIdx]);

  function go(row: Row) {
    const next = [row.id, ...recents.filter((x) => x !== row.id)].slice(0, 5);
    setRecents(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* fail-soft: recents just won't persist */
    }
    onClose();
    navigate(row.to);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (flat.length) setSel((selIdx + 1) % flat.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (flat.length) setSel((selIdx - 1 + flat.length) % flat.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const row = flat[selIdx];
      if (row) go(row);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "Tab") {
      // Focus trap: the input is the dialog's only tab stop.
      e.preventDefault();
      inputRef.current?.focus();
    }
  }

  if (!open) return null;

  return (
    <>
      <style>{CSS}</style>
      <button type="button" className="cbx-veil" aria-label="Close command bar" onClick={onClose} />
      <div className="cbx-wrap" role="dialog" aria-modal="true" aria-label="Command bar" onKeyDown={onKeyDown}>
        <div className="cbx-panel">
          <div className="cbx-inputrow">
            {SEARCH_ICON}
            <input
              ref={inputRef}
              role="combobox"
              aria-expanded="true"
              aria-controls="cbx-list"
              aria-activedescendant={flat.length ? `cbx-opt-${selIdx}` : undefined}
              aria-autocomplete="list"
              aria-label="Search pages, businesses and actions"
              placeholder="Search or jump to..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSel(0);
              }}
            />
          </div>

          <div
            ref={listRef}
            id="cbx-list"
            role="listbox"
            aria-label="Destinations"
            className="cbx-list"
            // Keep focus (and the caret) in the input while clicking rows.
            onMouseDown={(e) => e.preventDefault()}
          >
            {flat.length === 0 && <div className="cbx-empty">Nothing matches &ldquo;{query.trim()}&rdquo;.</div>}
            {sections.map((s, si) => (
              <div key={s.group} role="group" aria-label={s.group}>
                <div className="cbx-group" role="presentation">
                  {s.group}
                </div>
                {s.items.map((row, ri) => {
                  const idx = offsets[si] + ri;
                  return (
                    <div
                      key={row.id}
                      id={`cbx-opt-${idx}`}
                      role="option"
                      aria-selected={idx === selIdx}
                      className={`cbx-opt${idx === selIdx ? " sel" : ""}`}
                      onMouseEnter={() => setSel(idx)}
                      onClick={() => go(row)}
                    >
                      <span className="cbx-ic" aria-hidden="true">
                        {row.icon}
                      </span>
                      <span className="cbx-t">
                        <span className="cbx-label">{highlight(row.label, row.hl)}</span>
                        {row.hint && <span className="cbx-hint">{row.hint}</span>}
                      </span>
                      <span className="cbx-enter" aria-hidden="true">
                        ↵
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="cbx-foot">
            <span>
              <kbd className="cbx-kbd">↑</kbd>
              <kbd className="cbx-kbd">↓</kbd> navigate
            </span>
            <span>
              <kbd className="cbx-kbd">↵</kbd> open
            </span>
            <span>
              <kbd className="cbx-kbd">esc</kbd> close
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
