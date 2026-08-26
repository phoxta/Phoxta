import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { toast, toastError, confirmDanger } from "@/lib/ops/feedback";
import { Card, Empty, PageHeader } from "@/components/dash/Ui";
import type { OpsContext } from "@/layouts/OperatingLayout";
import {
  listDesigns, createDesign, saveDesign, archiveDesign, generateDesign, type Design,
} from "@/lib/db/designs";
import { DesignSvg } from "@/lib/designs/render";
import { exportPng, downloadPng } from "@/lib/designs/export";
import { TEMPLATES, getTemplate, imageSlotsOf, textSlotsOf } from "@/lib/designs/templates";
import { DEFAULT_PALETTE, emptyDoc, type DesignDoc, type ImageSlot, type TextSlot } from "@/lib/designs/types";
import "./designs.css";

/**
 * Graphics — social posts from the Digital Agency template pack.
 *
 * Two ways to make one, both writing to the same document: type into it, or
 * describe it and let the agent write it. There is no separate "AI mode" — the
 * generator fills the same content map the fields edit, which is what lets a
 * generated post be hand-corrected immediately instead of regenerated until it
 * happens to come out right.
 *
 * The canvas is the real artwork at 1080×1350, scaled by one transform. Click a
 * headline on the canvas to edit that headline; the fields and the canvas are
 * two views of one object, not a form that builds a picture.
 */

const ln = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const I_BACK = <svg width="16" height="16" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>;
const I_DOWN = <svg width="16" height="16" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M12 4v11m0 0 4-4m-4 4-4-4M5 20h14" /></svg>;
const I_SPARK = <svg width="16" height="16" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></svg>;
const I_PLUS = <svg width="16" height="16" viewBox="0 0 24 24" {...ln} aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;

/** Field labels — slot names are storage, not language. */
const LABELS: Record<string, string> = {
  title: "Headline",
  subtitle: "Sub-heading",
  description: "Body",
  statistic: "Big number",
  testimonial: "Quote",
  quote: "Attribution",
  cta: "Button",
  score: "Badge",
  point1: "Tag 1",
  point2: "Tag 2",
  point3: "Tag 3",
  phone: "Phone",
  website: "Website",
};

const IMAGE_LABELS: Record<string, string> = {
  image1: "Photo 1", image2: "Photo 2", image3: "Photo 3",
};

export default function DesignsPage() {
  const { orgId, org } = useOutletContext<OpsContext>();

  const [rows, setRows] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Design | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await listDesigns(orgId);
    if (error) toastError(error);
    setRows(data);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { void load(); }, [load]);

  if (open) {
    return (
      <Editor
        design={open}
        orgName={org?.name ?? "your business"}
        onClose={async () => { setOpen(null); await load(); }}
      />
    );
  }

  return (
    <div className="d-flex flex-column" style={{ gap: 8 }}>
      <PageHeader
        crumb="Console"
        title="Graphics"
        note="Social posts from the agency template pack. Edit them by hand, or describe one and let the agent write it."
        stat={{ label: "Posts", value: rows.length }}
      />

      <NewDesign orgId={orgId} onMade={(d) => setOpen(d)} />

      <Card title="Your posts">
        {loading ? (
          <p className="dsn-note">Loading…</p>
        ) : rows.length === 0 ? (
          <Empty title="Nothing here yet">
            Start from a template above, or describe the post you want and the agent will draft it.
          </Empty>
        ) : (
          <div className="dsn-grid">
            {rows.map((d) => (
              <article key={d.id} className="dsn-tile">
                <button type="button" className="dsn-tile__art" onClick={() => setOpen(d)}
                        aria-label={`Open ${d.title}`}>
                  <DesignSvg doc={d.doc} width={260} />
                </button>
                <div className="dsn-tile__foot">
                  <div style={{ minWidth: 0 }}>
                    <span className="dsn-tile__name">{d.title}</span>
                    <span className="dsn-tile__meta">
                      {getTemplate(d.template_id)?.name ?? d.template_id}
                    </span>
                  </div>
                  <button
                    type="button" className="dsn-x"
                    onClick={async () => {
                      if (!(await confirmDanger(`Archive "${d.title}"?`))) return;
                      const { error } = await archiveDesign(d.id);
                      if (error) return toastError(error);
                      toast("Archived.");
                      await load();
                    }}
                    aria-label={`Archive ${d.title}`}
                  >×</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ── Starting a post ─────────────────────────────────────────────────────── */

function NewDesign({ orgId, onMade }: { orgId: string; onMade: (d: Design) => void }) {
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);

  async function fromTemplate(templateId: string) {
    const t = getTemplate(templateId);
    const { data, error } = await createDesign(orgId, {
      title: t ? `${t.name} post` : "New post",
      templateId,
      doc: emptyDoc(templateId),
    });
    if (error || !data) return toastError(error ?? "Could not create that post.");
    onMade(data);
  }

  async function fromBrief() {
    const text = brief.trim();
    if (!text) return toastError("Say what the post should be about.");
    setBusy(true);
    const { data, error } = await generateDesign(orgId, text);
    if (error || !data) { setBusy(false); return toastError(error ?? "The agent could not write that."); }

    const doc: DesignDoc = {
      templateId: data.templateId,
      content: data.content as Partial<Record<TextSlot, string>>,
      images: data.images as DesignDoc["images"],
      palette: data.palette as DesignDoc["palette"],
    };
    const { data: row, error: err2 } = await createDesign(orgId, {
      title: data.title, templateId: data.templateId, doc, brief: text,
    });
    setBusy(false);
    if (err2 || !row) return toastError(err2 ?? "Could not save that post.");
    setBrief("");
    onMade(row);
  }

  return (
    <Card title="New post">
      <div className="dsn-brief">
        <input
          className="hrx-input dsn-input"
          placeholder="Describe the post — e.g. “we cut delivery times to 15 minutes, aimed at busy parents”"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void fromBrief(); }}
          disabled={busy}
        />
        <button type="button" className="dsn-btn dsn-btn--solid" onClick={() => void fromBrief()} disabled={busy}>
          {I_SPARK}{busy ? "Writing…" : "Write it for me"}
        </button>
      </div>
      <p className="dsn-note">
        Or start from a layout and fill it in yourself — the agent can still rewrite it later.
      </p>
      <div className="dsn-templates">
        {TEMPLATES.map((t) => (
          <button key={t.id} type="button" className="dsn-template" onClick={() => void fromTemplate(t.id)}>
            <span className="dsn-template__art"><DesignSvg doc={emptyDoc(t.id)} width={150} /></span>
            <span className="dsn-template__name">{I_PLUS}{t.name}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}

/* ── The editor ──────────────────────────────────────────────────────────── */

function Editor({ design, orgName, onClose }: { design: Design; orgName: string; onClose: () => void }) {
  const [doc, setDoc] = useState<DesignDoc>(() => ({ ...emptyDoc(design.template_id), ...design.doc }));
  const [title, setTitle] = useState(design.title);
  const [selected, setSelected] = useState<{ id: string; slot: string; kind: "text" | "image" } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<"" | "saving" | "exporting" | "writing">("");
  const stage = useRef<HTMLDivElement>(null);

  const template = getTemplate(doc.templateId);
  const content = useMemo(() => ({ ...(template?.content ?? {}), ...doc.content }), [template, doc.content]);

  const setText = (slot: string, value: string) => {
    setDoc((d) => ({ ...d, content: { ...d.content, [slot]: value } }));
    setDirty(true);
  };

  const setPalette = (role: string, value: string) => {
    setDoc((d) => ({ ...d, palette: { ...(d.palette ?? {}), [role]: value } }));
    setDirty(true);
  };

  async function save() {
    setBusy("saving");
    const { error } = await saveDesign(design.id, { title, doc, template_id: doc.templateId });
    setBusy("");
    if (error) return toastError(error);
    setDirty(false);
    toast("Saved.");
  }

  async function download() {
    const svg = stage.current?.querySelector("svg");
    if (!svg) return toastError("The canvas is not ready yet.");
    setBusy("exporting");
    try {
      const { blob } = await exportPng(svg as SVGSVGElement, doc);
      downloadPng(blob, title || "post");
      toast("Downloaded.");
    } catch (e) {
      toastError((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  /** Rewrite the copy, keeping the layout the founder chose. */
  async function rewrite() {
    const brief = window.prompt("What should this post say?", design.brief ?? "");
    if (brief === null || !brief.trim()) return;
    setBusy("writing");
    const { data, error } = await generateDesign(design.organization_id, brief.trim(), doc.templateId);
    setBusy("");
    if (error || !data) return toastError(error ?? "The agent could not rewrite that.");
    setDoc((d) => ({
      ...d,
      content: data.content as Partial<Record<TextSlot, string>>,
      // Photos already chosen are kept: rewriting the words should not throw
      // away a picture someone picked on purpose.
      images: { ...(data.images as DesignDoc["images"]), ...d.images },
      palette: (data.palette as DesignDoc["palette"]) ?? d.palette,
    }));
    setDirty(true);
    toast("Rewritten — the photos you chose were kept.");
  }

  if (!template) return <p className="dsn-note">That template no longer exists.</p>;

  const textSlots = textSlotsOf(template);
  const imageSlots = imageSlotsOf(template);
  const palette = { ...DEFAULT_PALETTE, ...(doc.palette ?? {}) };

  return (
    <div className="d-flex flex-column" style={{ gap: 8 }}>
      <div className="dsn-bar">
        <button type="button" className="dsn-btn" onClick={() => {
          if (dirty && !window.confirm("Close without saving?")) return;
          onClose();
        }}>{I_BACK}Back</button>

        <input
          className="hrx-input dsn-title"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
          aria-label="Post name"
        />

        <div className="dsn-bar__right">
          <button type="button" className="dsn-btn" onClick={() => void rewrite()} disabled={busy !== ""}>
            {I_SPARK}{busy === "writing" ? "Writing…" : "Rewrite"}
          </button>
          <button type="button" className="dsn-btn" onClick={() => void download()} disabled={busy !== ""}>
            {I_DOWN}{busy === "exporting" ? "Rendering…" : "PNG"}
          </button>
          <button type="button" className="dsn-btn dsn-btn--solid" onClick={() => void save()} disabled={busy !== "" || !dirty}>
            {busy === "saving" ? "Saving…" : dirty ? "Save" : "Saved"}
          </button>
        </div>
      </div>

      <div className="dsn-editor">
        <div className="dsn-stage" ref={stage} onClick={() => setSelected(null)}>
          <DesignSvg
            doc={doc}
            width={520}
            selectedId={selected?.id ?? null}
            onSelect={(id, slot, kind) => setSelected({ id, slot, kind })}
          />
        </div>

        <aside className="dsn-panel">
          <section className="dsn-sec">
            <h4 className="dsn-sec__h">Layout</h4>
            <div className="dsn-swatches">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id} type="button"
                  className={`dsn-layout${t.id === doc.templateId ? " is-on" : ""}`}
                  onClick={() => {
                    // Content carries across: the slots are shared vocabulary,
                    // and a layout swap that wiped the words would make trying
                    // a second layout cost as much as starting again.
                    setDoc((d) => ({ ...d, templateId: t.id }));
                    setSelected(null);
                    setDirty(true);
                  }}
                  title={t.purpose}
                >{t.name}</button>
              ))}
            </div>
            <p className="dsn-note">{template.purpose}</p>
          </section>

          <section className="dsn-sec">
            <h4 className="dsn-sec__h">Words</h4>
            {textSlots.map(({ slot, id, multiline }) => (
              <label key={slot} className={`dsn-field${selected?.slot === slot ? " is-on" : ""}`}>
                <span className="dsn-field__k">{LABELS[slot] ?? slot}</span>
                {multiline ? (
                  <textarea
                    className="hrx-input" rows={3}
                    value={content[slot as TextSlot] ?? ""}
                    onFocus={() => setSelected({ id, slot, kind: "text" })}
                    onChange={(e) => setText(slot, e.target.value)}
                  />
                ) : (
                  <input
                    className="hrx-input"
                    value={content[slot as TextSlot] ?? ""}
                    onFocus={() => setSelected({ id, slot, kind: "text" })}
                    onChange={(e) => setText(slot, e.target.value)}
                  />
                )}
              </label>
            ))}
            <p className="dsn-note">
              Wrap words in *asterisks* in the headline to paint them in the accent colour.
            </p>
          </section>

          {imageSlots.length > 0 && (
            <section className="dsn-sec">
              <h4 className="dsn-sec__h">Photos</h4>
              {imageSlots.map((slot) => (
                <ImageField
                  key={slot}
                  label={IMAGE_LABELS[slot] ?? slot}
                  value={doc.images[slot as ImageSlot]?.url ?? ""}
                  credit={doc.images[slot as ImageSlot]?.photographer}
                  onChange={(url) => {
                    setDoc((d) => ({
                      ...d,
                      images: url
                        ? { ...d.images, [slot]: { url, source: "upload" as const } }
                        : Object.fromEntries(Object.entries(d.images).filter(([k]) => k !== slot)),
                    }));
                    setDirty(true);
                  }}
                />
              ))}
            </section>
          )}

          <section className="dsn-sec">
            <h4 className="dsn-sec__h">Colours</h4>
            {(["accent", "ink", "gradientFrom", "gradientTo", "canvas"] as const).map((role) => (
              <label key={role} className="dsn-colour">
                <input
                  type="color"
                  value={palette[role]}
                  onChange={(e) => setPalette(role, e.target.value)}
                  aria-label={role}
                />
                <span className="dsn-field__k">{role.replace(/([A-Z])/g, " $1").toLowerCase()}</span>
                <code className="dsn-hex">{palette[role]}</code>
              </label>
            ))}
            <button
              type="button" className="dsn-btn dsn-btn--sm"
              onClick={() => { setDoc((d) => ({ ...d, palette: undefined })); setDirty(true); }}
            >Reset to the pack's colours</button>
          </section>

          <p className="dsn-note">
            Exports at 2160×2700 for {orgName}. Photographs from Pexels carry their photographer's
            credit on the design — that is the licence, not a caption.
          </p>
        </aside>
      </div>
    </div>
  );
}

/**
 * A photo field.
 *
 * A URL box and a file picker. The file is read to a data URI rather than
 * uploaded: it lands in the doc, which means it exports and it survives without
 * a storage bucket, at the cost of size — so it is capped, loudly, rather than
 * silently producing a row too big to save.
 */
function ImageField({ label, value, credit, onChange }: {
  label: string; value: string; credit?: string; onChange: (url: string) => void;
}) {
  const MAX = 1_500_000;
  return (
    <div className="dsn-field">
      <span className="dsn-field__k">{label}</span>
      <div className="dsn-img">
        {value ? <img src={value} alt="" className="dsn-img__thumb" /> : <span className="dsn-img__empty">none</span>}
        <div className="dsn-img__acts">
          <label className="dsn-btn dsn-btn--sm">
            Upload
            <input
              type="file" accept="image/*" hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > MAX) {
                  toastError("That image is over 1.5 MB — please use a smaller one.");
                  return;
                }
                const fr = new FileReader();
                fr.onload = () => onChange(String(fr.result));
                fr.readAsDataURL(f);
              }}
            />
          </label>
          {value && (
            <button type="button" className="dsn-btn dsn-btn--sm" onClick={() => onChange("")}>Clear</button>
          )}
        </div>
      </div>
      {credit && <span className="dsn-note">{credit} / Pexels</span>}
    </div>
  );
}
