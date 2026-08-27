import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/dash/Ui";
import { toast, toastError } from "@/lib/ops/feedback";
import { renderBrochure, type Block } from "@email";
import {
  ADD_GROUPS, SPECS, blockLabel, blockSummary, fromField, readField, toField, writeField,
} from "./emailBlocks";
import {
  type EmailTemplate, saveEmail, sendEmail, sendTest,
} from "@/lib/db/emailStudio";
import { DesignPicker } from "./DesignPicker";
import { DesignLinks } from "./DesignLinks";
import { EmailCanvas } from "./EmailCanvas";

/**
 * The email composer.
 *
 * WHY THIS IS NOT THE GRAPHICS CANVAS. The canvas is an SVG artboard of
 * absolutely-positioned layers at a fixed size. Email is the opposite of all
 * three: Outlook renders with Word and draws no SVG at all, absolute
 * positioning does not survive a single mail client, and a fixed width cannot
 * reflow onto a phone — which is where most of this gets read. Emitting email
 * HTML from the canvas would produce a second renderer whose drift from the
 * first shows up only after the send button.
 *
 * So the canvas here is the email's own: a list of blocks, in order, edited in
 * place, previewed by importing the SAME renderer the edge function calls. The
 * two surfaces cannot disagree because there is only one of them.
 *
 * A design made on the graphics canvas still gets in — as a picture, which is
 * what a designed graphic is in an email and what every serious sender does
 * with one. `Import a design` rasterises it, puts it in the business's asset
 * library and drops in an image block with alt text and a link. The warning
 * about an all-image email is real and is shown, because a message that is one
 * big picture is both a spam signal and unreadable to anyone with images off.
 */

type Draft = Omit<EmailTemplate, "id" | "status" | "updated_at"> & { id?: string };

/** Where a block lives: [i] at the top level, [i, j] inside a dark section. */
type Path = number[];

const samePath = (a: Path | null, b: Path) => !!a && a.length === b.length && a.every((v, i) => v === b[i]);

const getAt = (blocks: Block[], p: Path): Block | null =>
  p.length === 1 ? blocks[p[0]] ?? null
    : ((blocks[p[0]] as { blocks?: Block[] })?.blocks ?? [])[p[1]] ?? null;

function editAt(blocks: Block[], p: Path, fn: (list: Block[]) => Block[]): Block[] {
  if (p.length === 1) return fn(blocks);
  return blocks.map((b, i) =>
    i === p[0] && b.type === "band" ? { ...b, blocks: fn(b.blocks) } : b);
}

export function EmailComposer({
  orgId, initial, onClose, onSaved,
}: {
  orgId: string;
  initial: Draft;
  onClose: () => void;
  onSaved?: (id: string) => void;
}) {
  const [draft, setDraft] = useState<Draft>(initial);
  const [sel, setSel] = useState<Path | null>(initial.blocks.length ? [0] : null);
  const [width, setWidth] = useState<"phone" | "desktop">("desktop");
  const [showText, setShowText] = useState(false);
  const [adding, setAdding] = useState<Path | null>(null);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState<"" | "saving" | "sending">("");
  const [to, setTo] = useState("");

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const rendered = useMemo(() => {
    try {
      return renderBrochure({
        editable: true,
        subject: draft.subject || draft.name || "Phoxta",
        preheader: draft.preheader,
        strap: draft.strap || "Phoxta",
        blocks: draft.blocks,
        footnote: draft.footnote || undefined,
      });
    } catch (e) {
      // A half-edited block should show as a broken preview, not an empty page
      // with no clue what went wrong.
      return { html: `<pre style="font:13px/1.5 monospace;padding:20px;color:#b00">${String(e)}</pre>`, text: String(e) };
    }
  }, [draft]);

  // ── block operations ──────────────────────────────────────────────────────
  const mutate = (p: Path, fn: (list: Block[]) => Block[]) =>
    setDraft((d) => ({ ...d, blocks: editAt(d.blocks, p, fn) }));

  const update = (p: Path, b: Block) =>
    mutate(p, (list) => list.map((x, i) => (i === p[p.length - 1] ? b : x)));

  const insert = (p: Path, type: string) => {
    const b = SPECS[type].make();
    mutate(p, (list) => [...list.slice(0, p[p.length - 1]), b, ...list.slice(p[p.length - 1])]);
    setSel(p);
    setAdding(null);
  };

  const remove = (p: Path) => {
    mutate(p, (list) => list.filter((_, i) => i !== p[p.length - 1]));
    setSel(null);
  };

  const nudge = (p: Path, dir: -1 | 1) => {
    const i = p[p.length - 1];
    mutate(p, (list) => {
      const to = i + dir;
      if (to < 0 || to >= list.length) return list;
      const next = list.slice();
      [next[i], next[to]] = [next[to], next[i]];
      return next;
    });
    setSel([...p.slice(0, -1), Math.max(0, Math.min(i + dir, 99))]);
  };

  // ── drag to reorder, within one level ─────────────────────────────────────
  // Same gesture as the layers panel: a few pixels of slack before it counts
  // as a drag, so a click still selects.
  const press = useRef<{ p: Path; y: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState<Path | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const rowIndexAt = (y: number): number | null => {
    const el = listRef.current;
    if (!el) return null;
    const rows = [...el.querySelectorAll<HTMLElement>("[data-row]")];
    for (const r of rows) {
      const rect = r.getBoundingClientRect();
      if (y < rect.top + rect.height / 2) return Number(r.dataset.row);
    }
    return rows.length;
  };

  const onMove = (e: React.PointerEvent) => {
    const p = press.current;
    if (!p) return;
    if (!p.moved && Math.abs(e.clientY - p.y) < 4) return;
    if (!p.moved) {
      p.moved = true;
      setDragging(p.p);
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    }
    setOverIndex(rowIndexAt(e.clientY));
  };

  const onUp = () => {
    const p = press.current;
    press.current = null;
    const at = overIndex;
    setDragging(null);
    setOverIndex(null);
    if (!p?.moved || at == null || p.p.length !== 1) return;
    const from = p.p[0];
    const to = at > from ? at - 1 : at;
    if (to === from) return;
    setDraft((d) => {
      const next = d.blocks.slice();
      const [b] = next.splice(from, 1);
      next.splice(to, 0, b);
      return { ...d, blocks: next };
    });
    setSel([to]);
  };

  // ── save / send ───────────────────────────────────────────────────────────
  const save = useCallback(async () => {
    setBusy("saving");
    const { data, error } = await saveEmail(draft as EmailTemplate);
    setBusy("");
    if (error) return toastError(error);
    if (data?.id && !draft.id) setDraft((d) => ({ ...d, id: data.id }));
    onSaved?.(data!.id);
    toast("Saved.");
  }, [draft, onSaved]);

  const test = async () => {
    if (!to.includes("@")) return toastError("Put an address in first.");
    setBusy("sending");
    const { data, error } = await sendTest(draft as EmailTemplate, to);
    setBusy("");
    if (error) return toastError(error);
    if (!data?.ok) return toastError("Resend refused it: " + JSON.stringify(data?.error ?? ""));
    toast("Test sent to " + to + ".");
  };

  const send = async () => {
    if (!to.includes("@")) return toastError("Put an address in first.");
    setBusy("sending");
    const { data, error } = await sendEmail(draft as EmailTemplate, to);
    setBusy("");
    if (error) return toastError(error);
    if (data?.skipped) return toastError(`Not sent — ${data.skipped}.`);
    if (!data?.ok) return toastError("Resend refused it.");
    toast("Sent to " + to + ".");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") { e.preventDefault(); void save(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  const selected = sel ? getAt(draft.blocks, sel) : null;
  const imageOnly = draft.blocks.length > 0 &&
    draft.blocks.filter((b) => ["image", "hero", "figure", "cover"].includes(b.type)).length / draft.blocks.length > 0.6;

  // Flatten for rendering the list, keeping band children indented under theirs.
  const rows: Array<{ path: Path; block: Block; depth: number }> = [];
  draft.blocks.forEach((b, i) => {
    rows.push({ path: [i], block: b, depth: 0 });
    if (b.type === "band") b.blocks.forEach((c, j) => rows.push({ path: [i, j], block: c, depth: 1 }));
  });

  return (
    <div className="emc">
      <div className="emc__bar">
        <button type="button" className="hrx-seeall" onClick={onClose}>← All emails</button>
        <input className="emc__name" value={draft.name} placeholder="Untitled email"
               onChange={(e) => set("name", e.target.value)} />
        <div className="emc__spacer" />
        <button type="button" className="hrx-seeall" onClick={() => setPicking(true)}>Import a design</button>
        <button type="button" className="hrx-seeall opx-solid" disabled={busy !== ""} onClick={() => void save()}>
          {busy === "saving" ? "Saving…" : "Save"}
        </button>
      </div>

      <div className="emc__cols">
        {/* ── left: what the email is, and what is in it ── */}
        <div className="emc__side">
          <Card title="The inbox line">
            <label className="emc__f">
              <span>Subject</span>
              <input value={draft.subject} onChange={(e) => set("subject", e.target.value)} />
            </label>
            <label className="emc__f">
              <span>Preheader</span>
              <textarea rows={2} value={draft.preheader} onChange={(e) => set("preheader", e.target.value)} />
              <em>The second line in the inbox. Say something new — not &ldquo;view in browser&rdquo;.</em>
            </label>
            <label className="emc__f">
              <span>Masthead strap</span>
              <input value={draft.strap} onChange={(e) => set("strap", e.target.value)} />
            </label>
            <label className="emc__f">
              <span>Footnote</span>
              <textarea rows={2} value={draft.footnote} onChange={(e) => set("footnote", e.target.value)} />
            </label>
          </Card>

          <Card title="Blocks" right={
            <button type="button" className="hrx-seeall"
                    onClick={() => setAdding([draft.blocks.length])}>Add</button>
          }>
            {imageOnly && (
              <p className="emc__warn">
                Most of this email is picture. With images blocked — which is the default in Outlook and
                for plenty of Gmail readers — there will be almost nothing to read, and filters treat an
                all-image message as a signal in its own right. Put some of it in text.
              </p>
            )}
            <div className="emc__list" ref={listRef} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
              {rows.length === 0 && <p className="dsn-note">Nothing yet. Add a block, or import a design.</p>}
              {rows.map(({ path, block, depth }) => (
                <div key={path.join("-")} data-row={depth === 0 ? path[0] : undefined}>
                  {overIndex === path[0] && depth === 0 && dragging && <div className="emc__slot" />}
                  <button
                    type="button"
                    className={`emc__row${samePath(sel, path) ? " is-on" : ""}${samePath(dragging, path) ? " is-drag" : ""}`}
                    style={{ marginLeft: depth * 16 }}
                    onPointerDown={(e) => {
                      if (depth > 0 || e.button !== 0) return;
                      press.current = { p: path, y: e.clientY, moved: false };
                    }}
                    onClick={() => setSel(path)}
                  >
                    <span className="emc__rowType">{blockLabel(block)}</span>
                    <span className="emc__rowText">{blockSummary(block)}</span>
                  </button>
                </div>
              ))}
              {overIndex === draft.blocks.length && dragging && <div className="emc__slot" />}
            </div>
          </Card>

          {selected && sel && (
            <Card
              title={blockLabel(selected)}
              right={
                <div className="d-flex gap-2">
                  <button type="button" className="hrx-seeall" onClick={() => nudge(sel, -1)}>↑</button>
                  <button type="button" className="hrx-seeall" onClick={() => nudge(sel, 1)}>↓</button>
                  <button type="button" className="hrx-seeall" onClick={() => remove(sel)}>Delete</button>
                </div>
              }
            >
              {selected.type === "image" && selected.src && (
                <DesignLinks
                  block={selected}
                  orgId={orgId}
                  onChange={(b) => update(sel, b)}
                />
              )}
              <BlockForm block={selected} onChange={(b) => update(sel, b)} />
              {selected.type === "band" && (
                <button type="button" className="hrx-seeall mt-2"
                        onClick={() => setAdding([sel[0], (selected as { blocks: Block[] }).blocks.length])}>
                  Add a block inside
                </button>
              )}
            </Card>
          )}

          <Card title="Send">
            <label className="emc__f">
              <span>To</span>
              <input value={to} placeholder="you@phoxta.com" onChange={(e) => setTo(e.target.value)} />
            </label>
            <div className="d-flex gap-2">
              <button type="button" className="hrx-seeall" disabled={busy !== ""} onClick={() => void test()}>
                Send a test
              </button>
              <button type="button" className="hrx-seeall opx-solid" disabled={busy !== ""} onClick={() => void send()}>
                {busy === "sending" ? "Sending…" : "Send for real"}
              </button>
            </div>
            <p className="dsn-note mt-2">
              A test is not written to the send ledger, so it will not use up this address&apos;s one copy of
              the real thing. A real send checks the opt-out list first and refuses a second copy.
            </p>
          </Card>
        </div>

        {/* ── right: exactly what will arrive ── */}
        <div className="emc__main">
          <div className="emc__tools">
            {(["desktop", "phone"] as const).map((w) => (
              <button key={w} type="button" className={`hrx-seeall${width === w ? " opx-solid" : ""}`}
                      onClick={() => setWidth(w)}>{w === "phone" ? "Phone" : "Desktop"}</button>
            ))}
            <button type="button" className={`hrx-seeall${showText ? " opx-solid" : ""}`}
                    onClick={() => setShowText((v) => !v)}>Plain text</button>
            <span className="dsn-note ms-2">{(rendered.html.length / 1024).toFixed(1)} kb</span>
          </div>
          {showText ? (
            <pre className="emc__text">{rendered.text}</pre>
          ) : (
            <div className="emc__stage">
              <EmailCanvas
                html={rendered.html}
                width={width === "phone" ? 390 : 720}
                selected={sel}
                blockAt={(p) => getAt(draft.blocks, p)}
                // Re-selecting what is already selected must not produce a new
                // array: it would re-run the canvas effect and blur the caret.
                onSelect={(p) => setSel((cur) => (samePath(cur, p) ? cur : p))}
                onEdit={(p, key, value) => {
                  const b = getAt(draft.blocks, p);
                  if (b) update(p, writeField(b, key, value));
                }}
                onMove={nudge}
                onDelete={remove}
              />
            </div>
          )}
        </div>
      </div>

      {adding && (
        <AddMenu onPick={(type) => insert(adding, type)} onClose={() => setAdding(null)} />
      )}
      {picking && (
        <DesignPicker
          orgId={orgId}
          onClose={() => setPicking(false)}
          onPicked={(img) => {
            setPicking(false);
            setDraft((d) => ({ ...d, blocks: [...d.blocks, img] }));
            setSel([draft.blocks.length]);
          }}
          onConverted={(blocks, lost) => {
            setPicking(false);
            setDraft((d) => ({ ...d, blocks: [...d.blocks, ...blocks] }));
            setSel([draft.blocks.length]);
            // What a conversion drops has to be said out loud. A silent loss is
            // the entire problem with importing a design into a different
            // medium and calling it done.
            if (lost.length) toast("Brought in as words. " + lost.join(" "));
          }}
        />
      )}
      <style>{CSS}</style>
    </div>
  );
}

/** The per-block form, built from the spec rather than written by hand. */
function BlockForm({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  const spec = SPECS[block.type];
  if (!spec) return <p className="dsn-note">No editor for “{block.type}” yet.</p>;
  if (spec.fields.length === 0) return <p className="dsn-note">Nothing to set.</p>;

  return (
    <>
      {spec.fields.map((f) => {
        const v = readField(block, f.key);
        if (f.kind === "items") {
          const items = (v as Record<string, unknown>[]) ?? [];
          return (
            <div key={f.key} className="emc__f">
              <span>{f.label}</span>
              {items.map((it, i) => (
                <div key={i} className="emc__item">
                  {f.of!.map((sub) => (
                    <label key={sub.key} className="emc__f emc__f--tight">
                      <span>{sub.label}</span>
                      {sub.kind === "bool" ? (
                        <input type="checkbox" checked={Boolean(it[sub.key])}
                               onChange={(e) => onChange(writeField(block, f.key,
                                 items.map((x, j) => (j === i ? { ...x, [sub.key]: e.target.checked } : x))))} />
                      ) : sub.kind === "txt" ? (
                        <textarea rows={2} value={String(it[sub.key] ?? "")}
                                  onChange={(e) => onChange(writeField(block, f.key,
                                    items.map((x, j) => (j === i ? { ...x, [sub.key]: e.target.value } : x))))} />
                      ) : (
                        <input value={String(it[sub.key] ?? "")}
                               onChange={(e) => onChange(writeField(block, f.key,
                                 items.map((x, j) => (j === i ? { ...x, [sub.key]: e.target.value } : x))))} />
                      )}
                    </label>
                  ))}
                  <button type="button" className="hrx-seeall"
                          onClick={() => onChange(writeField(block, f.key, items.filter((_, j) => j !== i)))}>
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" className="hrx-seeall"
                      onClick={() => onChange(writeField(block, f.key, [...items, Object.fromEntries(f.of!.map((s) => [s.key, s.kind === "bool" ? false : ""]))]))}>
                Add one
              </button>
            </div>
          );
        }
        const multiline = f.kind === "txt" || f.kind === "lines" || f.kind === "rows" || f.kind === "pairs";
        return (
          <label key={f.key} className="emc__f">
            <span>{f.label}</span>
            {multiline ? (
              <textarea rows={f.kind === "txt" ? 3 : 4} value={fromField(f.kind, v)}
                        onChange={(e) => onChange(writeField(block, f.key, toField(f.kind, e.target.value)))} />
            ) : (
              <input value={fromField(f.kind, v)}
                     onChange={(e) => onChange(writeField(block, f.key, e.target.value))} />
            )}
            {f.hint && <em>{f.hint}</em>}
          </label>
        );
      })}
    </>
  );
}

function AddMenu({ onPick, onClose }: { onPick: (type: string) => void; onClose: () => void }) {
  return (
    <div className="emc__scrim" onClick={onClose}>
      <div className="emc__menu" onClick={(e) => e.stopPropagation()}>
        <h3>Add a block</h3>
        {ADD_GROUPS.map(({ group, types }) => (
          <section key={group}>
            <h4>{group}</h4>
            <div className="emc__menuGrid">
              {types.map((t) => (
                <button key={t} type="button" className="emc__menuItem" onClick={() => onPick(t)}>
                  {SPECS[t].label}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

const CSS = `
.emc{display:flex;flex-direction:column;gap:10px;height:calc(100vh - 130px)}
.emc__bar{display:flex;align-items:center;gap:8px}
.emc__name{flex:0 1 320px;padding:8px 12px;border:1px solid var(--hrx-border);border-radius:10px;font-size:14px;font-weight:600;color:var(--hrx-ink);background:var(--hrx-card)}
.emc__spacer{flex:1}
.emc__cols{display:grid;grid-template-columns:minmax(340px,400px) 1fr;gap:12px;min-height:0;flex:1}
.emc__side{overflow-y:auto;display:flex;flex-direction:column;gap:10px;padding-right:4px}
/* A flex item shrinks below its content unless told not to, and these are
   cards full of form fields — without this the bottom of every panel is
   clipped and the Send buttons are simply not there. */
.emc__side > *{flex:0 0 auto}
.emc__main{display:flex;flex-direction:column;gap:8px;min-height:0}
.emc__tools{display:flex;align-items:center;gap:8px}
.emc__stage{flex:1;display:flex;justify-content:center;padding:14px;background:#ececee;border-radius:14px;overflow:auto}
.emc__stage iframe{border:0;border-radius:10px;background:#fff;box-shadow:0 6px 24px rgb(0 0 0 / 12%)}
.emc__text{flex:1;margin:0;padding:18px;background:var(--hrx-soft);border:1px solid var(--hrx-border);border-radius:12px;font-size:13px;line-height:1.65;white-space:pre-wrap;overflow:auto}
.emc__item{border:1px solid var(--hrx-border);border-radius:10px;padding:10px;margin-bottom:8px;background:var(--hrx-soft)}
.emc__list{display:flex;flex-direction:column;gap:4px;margin-top:10px;max-height:46vh;overflow-y:auto}
.emc__row{display:block;width:100%;text-align:left;padding:8px 10px;border:1px solid transparent;border-radius:9px;background:var(--hrx-soft);cursor:grab}
.emc__row:hover{border-color:var(--hrx-border)}
.emc__row.is-on{border-color:var(--hrx-ink);background:var(--hrx-card)}
.emc__row.is-drag{opacity:.45}
.emc__rowType{display:block;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--hrx-muted)}
.emc__rowText{display:block;font-size:13px;color:var(--hrx-ink);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.emc__slot{height:2px;background:var(--hrx-blue);border-radius:2px;margin:2px 0}
.emc__warn{font-size:12.5px;line-height:1.5;color:#8a3b12;background:#fdeee8;border:1px solid #f6cdba;border-radius:10px;padding:10px 12px;margin:0}
.emc__scrim{position:fixed;inset:0;background:rgb(0 0 0 / 38%);display:flex;align-items:center;justify-content:center;z-index:60}
.emc__menu{background:var(--hrx-card);border-radius:16px;padding:22px;width:min(620px,92vw);max-height:82vh;overflow-y:auto}
.emc__menu h3{font-size:16px;font-weight:700;margin:0 0 14px}
.emc__menu h4{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--hrx-muted);margin:16px 0 8px}
.emc__menuGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px}
.emc__menuItem{padding:9px 11px;border:1px solid var(--hrx-border);border-radius:9px;background:var(--hrx-soft);font-size:13px;text-align:left;color:var(--hrx-ink);cursor:pointer}
.emc__menuItem:hover{border-color:var(--hrx-ink)}
@media (max-width: 1100px){ .emc__cols{grid-template-columns:1fr} .emc{height:auto} }
`;
