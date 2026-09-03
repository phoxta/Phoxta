import { useCallback, useEffect, useRef, useState } from "react";
import { toast, toastError } from "@/lib/ops/feedback";
import { catalogue } from "@/lib/designs/templates";
import { uploadAsset } from "@/lib/db/ops/designAssets";
import {
  type Direction, type Look,
  analyseReference, proposeLooks,
} from "@/lib/db/ops/designReference";
import { DocArt } from "./shared";

/**
 * Agreeing what the month will LOOK like, before any of it is made.
 *
 * The plan used to write thirty pieces of copy and drop each into whichever of
 * eighteen built-in layouts the model liked. The words were the business's; the
 * look was Phoxta's, and an owner with a brand — or just a poster they liked —
 * had nowhere to say so. So the art direction is settled the same way the
 * strategy is: proposed, shown, approved by a person, and only then used.
 *
 * TWO WAYS IN, AND THEY ARE NOT THE SAME THING.
 *
 *  - Upload your own artwork and it is rebuilt as a real layout you can see
 *    and edit. Your work, reproduced.
 *  - Take a suggested direction, or point at a reference on the web, and what
 *    comes back is direction — palette, type, how the page breathes. Not a
 *    copy: somebody else's artwork is not yours to republish, and direction is
 *    what a designer takes from a reference anyway.
 *
 * The server decides which of the two happens, from `origin`. This screen only
 * has to be honest about which one the owner is getting, which is why the two
 * paths never share a button.
 */
export function LookDialog({ orgId, open, brief, onClose, onChoose }: {
  orgId: string;
  open: boolean;
  /** What the month is for — steers the proposed directions. */
  brief: string;
  onClose: () => void;
  onChoose: (look: Look) => void;
}) {
  const [busy, setBusy] = useState<"propose" | "upload" | "url" | null>(null);
  const [directions, setDirections] = useState<Direction[]>([]);
  /** A rebuilt upload, waiting to be looked at and accepted. */
  const [built, setBuilt] = useState<{ look: Look; dropped: { what: string; why: string }[] } | null>(null);
  const [webUrl, setWebUrl] = useState("");
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose, busy]);

  // Reopening should not show the last plan's suggestions as if they were this
  // one's — the brief has probably changed.
  useEffect(() => { if (!open) { setDirections([]); setBuilt(null); setWebUrl(""); } }, [open]);

  const propose = useCallback(async () => {
    setBusy("propose");
    const { data, error } = await proposeLooks(orgId, { brief, catalogue: catalogue() });
    setBusy(null);
    if (error) return toastError(error);
    setDirections(data?.directions ?? []);
    if (data?.note) toast(data.note);
  }, [orgId, brief]);

  /**
   * Upload, then rebuild.
   *
   * It goes through the asset library rather than straight to the model so the
   * picture is stored: an owner who approves a look a fortnight later can still
   * see what they approved, and the same reference can be reused next month.
   */
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setBusy("upload");
    const up = await uploadAsset(orgId, f);
    if (up.error || !up.data) { setBusy(null); return toastError(up.error ?? "That file could not be stored."); }
    const { data, error } = await analyseReference(orgId, { url: up.data.url, origin: "upload" });
    setBusy(null);
    if (error) return toastError(error);
    if (!data?.doc) return toastError("Nothing in that picture could be read as a layout.");
    setBuilt({
      look: { ...data.look, doc: data.doc, referenceUrl: up.data.url, origin: "upload" },
      dropped: data.dropped ?? [],
    });
  }

  /** A reference on the web: direction only, and the screen says so. */
  async function fromUrl() {
    const url = webUrl.trim();
    if (!/^https:\/\//i.test(url)) return toastError("Paste a full https link to the picture.");
    setBusy("url");
    const { data, error } = await analyseReference(orgId, { url, origin: "web" });
    setBusy(null);
    if (error) return toastError(error);
    if (!data?.look) return;
    onChoose({ ...data.look, referenceUrl: url, origin: "web" });
    toast("Direction taken from that reference");
    onClose();
  }

  if (!open) return null;

  return (
    <div className="dsn-modal" role="dialog" aria-modal="true" aria-label="The look of this month"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="dsn-modal__box" style={{ width: "min(940px, 96vw)" }}>
        <div className="pln-header">
          <div className="pln-header-left">
            <h3 className="pln-header-title">What should this month look like?</h3>
          </div>
          <button type="button" className="dsn-x" onClick={onClose} disabled={!!busy} aria-label="Close">×</button>
        </div>

        <div className="pln-body-scroll">
          <div className="lkx">
            {/* ── your own artwork ─────────────────────────────────────── */}
            <section className="pln-block">
              <h4 className="pln-block-title">Use your own design</h4>
              <p className="pln-coverage-gap">
                Upload a post, a poster or a brand sheet and it is rebuilt as a layout you can edit —
                the same type, spacing and colours. Every post this month is then made in it.
              </p>
              <div className="lkx-actions">
                <input ref={file} type="file" accept="image/png,image/jpeg,image/webp,image/avif" hidden onChange={(e) => void onFile(e)} />
                <button type="button" className="pln-btn-primary" onClick={() => file.current?.click()} disabled={!!busy}>
                  {busy === "upload"
                    ? <><span className="pln-loader"><span></span><span></span><span></span></span>Reading your design…</>
                    : "Upload a reference"}
                </button>
              </div>

              {built && (
                <div className="lkx-built">
                  <div className="lkx-built__art">
                    {/* Drawn with the same renderer the editor uses, so what is
                        approved here is exactly what gets made. */}
                    <DocArt doc={built.look.doc} width={240} />
                  </div>
                  <div className="lkx-built__side">
                    <p className="pln-obs-what">{built.look.name}</p>
                    {built.look.feels && <p className="pln-obs-evidence">{built.look.feels}</p>}
                    {built.look.composition && <p className="pln-coverage-gap">{built.look.composition}</p>}
                    <Swatches palette={built.look.palette} />
                    {/* What could not be read is said plainly. A rebuild that
                        quietly lost three layers would be discovered later, on
                        a post that was already scheduled. */}
                    {built.dropped.map((d, i) => (
                      <p className="pln-coverage-gap" key={i}><b>{d.what}:</b> {d.why}</p>
                    ))}
                    <div className="lkx-actions">
                      <button type="button" className="pln-btn-primary" onClick={() => { onChoose(built.look); toast("The month will be made in your design"); onClose(); }}>
                        Make the month in this
                      </button>
                      <button type="button" className="pln-btn-ghost" onClick={() => setBuilt(null)}>Try another</button>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* ── let it suggest ───────────────────────────────────────── */}
            <section className="pln-block">
              <h4 className="pln-block-title">Or pick a direction</h4>
              <p className="pln-coverage-gap">
                Four looks worth choosing between, built from your brand colours and this month's brief.
              </p>
              <div className="lkx-actions">
                <button type="button" className={directions.length ? "pln-btn-ghost" : "pln-btn-primary"} onClick={() => void propose()} disabled={!!busy}>
                  {busy === "propose"
                    ? <><span className="pln-loader"><span></span><span></span><span></span></span>Working them up…</>
                    : directions.length ? "Suggest four more" : "Suggest some looks"}
                </button>
              </div>

              {!!directions.length && (
                <div className="lkx-grid">
                  {directions.map((d) => (
                    <button
                      type="button" key={d.key} className="lkx-card" disabled={!!busy}
                      onClick={() => {
                        onChoose({
                          name: d.name, feels: d.feels, composition: d.composition,
                          font: d.font, palette: d.palette, templateId: d.templateId,
                          origin: "suggested", referenceUrl: d.mood?.url,
                        });
                        toast(`The month will be made in “${d.name}”`);
                        onClose();
                      }}
                    >
                      {d.mood?.url && (
                        <img className="lkx-card__mood" src={d.mood.url} alt={d.mood.alt ?? ""} width={260} height={150} loading="lazy" />
                      )}
                      <span className="lkx-card__name">{d.name}</span>
                      <span className="lkx-card__feels">{d.feels}</span>
                      <Swatches palette={d.palette} />
                      {d.composition && <span className="lkx-card__comp">{d.composition}</span>}
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* ── a reference on the web ───────────────────────────────── */}
            <section className="pln-block">
              <h4 className="pln-block-title">Or point at something you like</h4>
              <p className="pln-coverage-gap">
                Paste a link to a design you admire and this takes its <b>direction</b> — the palette, the
                type, how much of the page is empty. Not a copy: that artwork belongs to whoever made it,
                and it is not yours to publish. Upload your own above if you want it rebuilt exactly.
              </p>
              <div className="lkx-actions">
                <input
                  className="pln-param-input lkx-url" type="url" value={webUrl}
                  placeholder="https://…"
                  onChange={(e) => setWebUrl(e.target.value)}
                  disabled={!!busy}
                />
                <button type="button" className="pln-btn-ghost" onClick={() => void fromUrl()} disabled={!!busy || !webUrl.trim()}>
                  {busy === "url" ? "Looking…" : "Take its direction"}
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The palette, as colour rather than as six hex codes nobody can picture. */
function Swatches({ palette }: { palette: Look["palette"] }) {
  const roles = ["canvas", "ink", "accent", "accentSoft", "gradientFrom", "gradientTo"] as const;
  const shown = roles.filter((r) => palette?.[r]);
  if (!shown.length) return null;
  return (
    <span className="lkx-swatches">
      {shown.map((r) => (
        <span key={r} className="lkx-swatch" style={{ background: palette[r] }} title={`${r} ${palette[r]}`} />
      ))}
    </span>
  );
}
