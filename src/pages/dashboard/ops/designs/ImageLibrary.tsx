import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { confirmDanger } from "@/lib/ops/feedback";
import type { LibraryImage } from "@/lib/db/designs";
import {
  ACCEPT_ATTR, assetToImage, deleteAsset, generateAsset, listAssets, searchStock, uploadAsset,
  type DesignAsset, type Orientation,
} from "@/lib/db/ops/designAssets";
import { AssetCutoutButton } from "./RemoveBackground";
import "./designs-assets.css";

/**
 * Where a picture comes from.
 *
 * Four sources behind one dialog, because from the editor's point of view they
 * answer the same question:
 *
 *   Your assets — what this business already owns. First, and first for a
 *                 reason: the right picture for a post is far more often one
 *                 the business already has than one it has to find or invent.
 *                 Until this tab existed there was nowhere for an uploaded
 *                 photograph to live, so every post started from nothing.
 *   Upload      — new files, one or many, stored rather than inlined.
 *   Generate    — the picture that does not exist: a specific composition, a
 *                 brand-coloured abstract. A generated image is stored exactly
 *                 like an upload, so it lands in Your assets and is reusable
 *                 tomorrow instead of being a one-shot.
 *   Stock       — free Pexels photography, searched server-side.
 *
 * Every card in Your assets also carries a "remove background" button. The
 * cut-out runs in this browser (see lib/designs/bgRemove) and is stored as a
 * SECOND asset — never a replacement. A mask that clips an ear is a certainty
 * rather than a risk, and the original has to still be there when it happens.
 *
 * The photographer's credit travels with every Pexels result and is stored on
 * the design. That is not politeness: the licence requires attribution wherever
 * the photograph appears, and a design that carries the URL without the name is
 * a licence breach that nobody notices until it matters. Uploaded and generated
 * assets carry no credit because the business owns them.
 *
 * PROPS ARE FROZEN. DesignsPage renders this and treats onPick as "insert and
 * close" (it clears `picking`, which unmounts the dialog). Nothing here may
 * change that contract.
 */

const ln = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const I_TRASH = (
  <svg width="14" height="14" viewBox="0 0 24 24" {...ln} aria-hidden="true">
    <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6" />
  </svg>
);
const I_UP = (
  <svg width="18" height="18" viewBox="0 0 24 24" {...ln} aria-hidden="true">
    <path d="M12 16V4m0 0 4 4m-4-4L8 8M5 20h14" />
  </svg>
);

type Tab = "assets" | "upload" | "generate" | "stock";

const TABS: ReadonlyArray<[Tab, string]> = [
  ["assets", "Your assets"],
  ["upload", "Upload"],
  ["generate", "Generate"],
  ["stock", "Stock"],
];

const ORIENTATIONS: ReadonlyArray<[Orientation, string]> = [
  ["square", "Square"],
  ["landscape", "Landscape"],
  ["portrait", "Portrait"],
];

const kb = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export function ImageLibrary({ orgId, hint, onPick, onClose }: {
  orgId: string;
  /** What this slot is meant to show, used as the opening search. */
  hint?: string;
  onPick: (image: LibraryImage) => void;
  onClose: () => void;
}) {
  // A hint means the caller already knows what the slot should show, and the
  // fastest answer to that is a stock search that has already run. With no
  // hint the business's own library is the better opening move.
  const [tab, setTab] = useState<Tab>(hint ? "stock" : "assets");
  const [err, setErr] = useState<string | null>(null);

  // Your assets
  const [assets, setAssets] = useState<DesignAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);

  /** The asset a background removal is running on, and how far it has got. */
  const [cut, setCut] = useState<{ path: string; stage: string } | null>(null);

  // Upload
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  // Generate
  const [prompt, setPrompt] = useState(hint ?? "");
  const [orient, setOrient] = useState<Orientation>("square");
  const [drawing, setDrawing] = useState(false);
  const [secs, setSecs] = useState(0);
  const [made, setMade] = useState<DesignAsset[]>([]);

  // Stock
  const [q, setQ] = useState(hint ?? "");
  const [searching, setSearching] = useState(false);
  const [photos, setPhotos] = useState<LibraryImage[]>([]);
  /** The stock photo currently being copied into the library, by URL. */
  const [placing, setPlacing] = useState<string | null>(null);

  const filterRef = useRef<HTMLInputElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const stockRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tab === "assets") filterRef.current?.focus();
    else if (tab === "generate") promptRef.current?.focus();
    else if (tab === "stock") stockRef.current?.focus();
  }, [tab]);

  // The library loads once, whichever tab opened, so switching to it is
  // instant and the empty state is honest rather than a spinner in disguise.
  useEffect(() => {
    let alive = true;
    void (async () => {
      const { data, error } = await listAssets(orgId);
      if (!alive) return;
      setAssets(data);
      setLoading(false);
      if (error) setErr(error);
    })();
    return () => { alive = false; };
  }, [orgId]);

  const runStock = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setSearching(true); setErr(null);
    const { data, error } = await searchStock(orgId, query);
    setSearching(false);
    if (error) return setErr(error);
    setPhotos(data);
    if (!data.length) setErr(`Nothing matched "${query}". Try fewer words.`);
  }, [orgId]);

  // The slot's own hint is the best first search anyone could type, so it runs
  // without being asked. An empty grid with a search box is a chore.
  useEffect(() => {
    if (hint) void runStock(hint);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Honest waiting. Generation takes most of a minute for a large image, and a
  // button that says "Generating…" with no clock reads as broken by second 30.
  useEffect(() => {
    if (!drawing) return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [drawing]);

  const shown = useMemo(() => {
    const t = filter.trim().toLowerCase();
    return t ? assets.filter((a) => a.name.toLowerCase().includes(t)) : assets;
  }, [assets, filter]);

  const insert = (a: DesignAsset) => onPick(assetToImage(a));

  async function receive(chosen: File[]) {
    const list = chosen.filter(Boolean);
    if (!list.length) return;
    setErr(null);
    setProgress({ done: 0, total: list.length });

    // Sequential on purpose: a dozen parallel multi-megabyte uploads from a
    // laptop on office wifi is how you get a dozen timeouts instead of a
    // dozen assets, and "3 of 12" is only truthful if they really are in order.
    const stored: DesignAsset[] = [];
    const failed: string[] = [];
    for (const f of list) {
      const { data, error } = await uploadAsset(orgId, f);
      if (data) stored.push(data);
      else failed.push(error ?? `${f.name} could not be uploaded.`);
      setProgress((p) => (p ? { done: p.done + 1, total: p.total } : p));
    }
    setProgress(null);
    if (file.current) file.current.value = "";
    if (stored.length) setAssets((a) => [...stored, ...a]);
    if (failed.length) setErr(failed.join(" "));

    // ONE file and no failure behaves exactly as this tab always has: the
    // picture goes straight into the design. The only difference is that it is
    // now also in the library. Several files is a different intent — stocking
    // the library — so those land in Your assets and wait to be chosen.
    if (list.length === 1 && stored.length === 1) { insert(stored[0]); return; }
    if (stored.length) setTab("assets");
  }

  async function remove(a: DesignAsset) {
    if (!confirmDanger(`Delete "${a.name}"? Any design already using it will lose the picture.`)) return;
    setRemoving(a.path); setErr(null);
    const { error } = await deleteAsset(orgId, a.path);
    setRemoving(null);
    if (error) return setErr(error);
    setAssets((list) => list.filter((x) => x.path !== a.path));
    setMade((list) => list.filter((x) => x.path !== a.path));
  }

  /**
   * Place a stock photo — through the library, never by hot-link.
   *
   * The design used to store the pexels.com URL directly, which left the
   * EXPORT responsible for fetching it: a fetch that depends on the page's CSP
   * and the host's CORS headers at whatever future moment someone presses
   * download. The Pexels case was patched once already; the CLASS stays open
   * for any remote host a photo could ever come from. So the bytes are fetched
   * NOW, while the person is looking at the picture and a failure has a face
   * to report to, and stored through the same upload path every other asset
   * uses — the document then carries a tenant-bucket URL that inlines forever.
   *
   * The Pexels credit travels UNCHANGED (photographer, URL, source): the
   * licence requires attribution wherever the photograph appears, and the
   * photographer does not stop existing because we cached their file.
   *
   * If the fetch or the upload fails, the remote URL is placed exactly as
   * before — a working design with a documented export-time risk beats a dead
   * click, and the export records the URL in missing[] if it later cannot be
   * reached.
   */
  async function pickStock(im: LibraryImage) {
    setPlacing(im.url);
    setErr(null);
    try {
      const r = await fetch(im.url, { mode: "cors" });
      if (!r.ok) throw new Error(`fetch ${r.status}`);
      const blob = await r.blob();
      const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
      const base = (im.alt?.trim() || "stock photo").toLowerCase()
        .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "stock-photo";
      const file = new File([blob], `${base}.${ext}`, { type: blob.type || "image/jpeg" });
      const { data, error } = await uploadAsset(orgId, file);
      if (error || !data) throw new Error(error ?? "upload failed");
      setAssets((a) => [data, ...a]);
      onPick({ ...im, url: data.url, thumb: data.url });
    } catch {
      onPick(im);
    } finally {
      setPlacing(null);
    }
  }

  async function draw() {
    const p = prompt.trim();
    if (!p) return;
    setErr(null); setSecs(0); setDrawing(true);
    const { data, error } = await generateAsset(orgId, p, orient);
    setDrawing(false);
    if (error) return setErr(error);
    if (!data) return setErr("That image could not be generated.");
    setAssets((a) => [data, ...a]);
    setMade((m) => [data, ...m]);
  }

  /** One asset, in the grid. Used by Your assets and by the Generate results. */
  const card = (a: DesignAsset) => (
    <figure key={a.path} className="dsn-as__card">
      <button type="button" className="dsn-as__pick" onClick={() => insert(a)}
              title={`Insert ${a.name}`} aria-label={`Insert ${a.name}`}>
        <img src={a.url} alt="" loading="lazy" width={160} height={170} />
      </button>
      <div className="dsn-as__meta">
        {/* While a cut-out runs, the name slot carries the stage instead. The
            run blocks the main thread for a few seconds, so a card that says
            nothing reads as a card that did nothing. */}
        <span className="dsn-as__name" title={cut?.path === a.path ? cut.stage : `${a.name} · ${kb(a.size)}`}>
          {cut?.path === a.path ? `${cut.stage}…` : a.name}
        </span>
        <span className="dsn-as__acts">
          {/* Background removal, in the browser. It never touches this asset:
              the cut-out comes back as a SECOND picture, because a mask that
              clips an ear is a certainty and the original has to still be
              there when it happens. */}
          <AssetCutoutButton
            orgId={orgId}
            asset={a}
            disabled={removing === a.path || (cut !== null && cut.path !== a.path)}
            onStage={(stage) => setCut(stage ? { path: a.path, stage } : null)}
            onError={setErr}
            onMade={(made) => {
              setAssets((list) => [made, ...list]);
              // A cut-out of something generated in this session belongs in
              // this session's results too, or it vanishes until the tab is
              // switched and the user thinks nothing happened.
              setMade((list) => (list.some((x) => x.path === a.path) ? [made, ...list] : list));
            }}
          />
          <button type="button" className="dsn-as__act is-danger" title={`Delete ${a.name}`}
                  aria-label={`Delete ${a.name}`} disabled={removing === a.path}
                  onClick={() => void remove(a)}>
            {I_TRASH}
          </button>
        </span>
      </div>
    </figure>
  );

  return (
    <div className="dsn-modal" role="dialog" aria-modal="true" aria-label="Choose a picture"
         onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dsn-modal__box dsn-lib">
        <header className="dsn-lib__head">
          <div className="dsn-lib__tabs" role="tablist">
            {TABS.map(([t, label]) => (
              <button key={t} type="button" role="tab" aria-selected={tab === t}
                      className={tab === t ? "is-on" : ""} onClick={() => { setTab(t); setErr(null); }}>
                {label}
              </button>
            ))}
          </div>
          <button type="button" className="dsn-x" onClick={onClose} aria-label="Close">×</button>
        </header>

        {/* ── Your assets ─────────────────────────────────────────────── */}
        {tab === "assets" && (
          <>
            <div className="dsn-lib__search">
              <input ref={filterRef} className="hrx-input" value={filter} onChange={(e) => setFilter(e.target.value)}
                     placeholder="Search your pictures by name" aria-label="Search your assets" />
              <button type="button" className="dsn-btn" onClick={() => setTab("upload")}>Add pictures</button>
            </div>
            {err && <p className="dsn-lib__err" role="status">{err}</p>}
            <div className="dsn-lib__grid dsn-as__grid">
              {shown.map(card)}
            </div>
            {loading && !assets.length && <p className="dsn-note">Loading your pictures…</p>}
            {!loading && !assets.length && (
              <div className="dsn-as__empty">
                <p className="dsn-as__empty-h">Nothing here yet</p>
                <p className="dsn-note">
                  Upload the photographs, logos and product shots this business already owns.
                  They stay here for every post you make from now on.
                </p>
                <button type="button" className="dsn-btn dsn-btn--solid" onClick={() => setTab("upload")}>
                  {I_UP} Upload your first picture
                </button>
              </div>
            )}
            {!loading && !!assets.length && !shown.length && (
              <p className="dsn-note">Nothing matched "{filter.trim()}".</p>
            )}
          </>
        )}

        {/* ── Upload ──────────────────────────────────────────────────── */}
        {tab === "upload" && (
          <>
            <div
              className={`dsn-lib__drop dsn-as__drop${dragging ? " is-over" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                void receive(Array.from(e.dataTransfer.files ?? []));
              }}
            >
              <p className="dsn-as__drop-h">{I_UP} Drop pictures here</p>
              <p className="dsn-note">or</p>
              <input ref={file} type="file" accept={ACCEPT_ATTR} multiple
                     aria-label="Choose image files" disabled={!!progress}
                     onChange={(e) => void receive(Array.from(e.target.files ?? []))} />
              <p className="dsn-note">
                PNG, JPEG, WebP, GIF or AVIF, up to 10MB each. They are stored in this business's
                library, so the same logo never has to be uploaded twice.
              </p>
              {/* Said here rather than buried in settings: the file gets a
                  permanent link so designs that use it keep working for as long
                  as they exist, and the honest consequence is that the link
                  works for anyone who has it. Only this business can see the
                  library itself. */}
              <p className="dsn-note">
                Only this business can browse the library. Each picture does get its own permanent
                link, so a design never loses its artwork — treat this as a place for images you are
                happy to publish, not for private documents.
              </p>
            </div>
            {progress && (
              <p className="dsn-as__progress" role="status">
                <span className="dsn-as__bar">
                  <span style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} />
                </span>
                Uploading {Math.min(progress.done + 1, progress.total)} of {progress.total}…
              </p>
            )}
            {err && <p className="dsn-lib__err" role="status">{err}</p>}
          </>
        )}

        {/* ── Generate ────────────────────────────────────────────────── */}
        {tab === "generate" && (
          <>
            <form className="dsn-as__gen" onSubmit={(e) => { e.preventDefault(); void draw(); }}>
              <textarea
                ref={promptRef} className="hrx-input dsn-as__prompt" rows={3} value={prompt}
                onChange={(e) => setPrompt(e.target.value)} disabled={drawing}
                placeholder="a flat-lay of artisan coffee beans on slate, soft morning light"
                aria-label="Describe the image to generate"
              />
              <div className="dsn-as__genrow">
                <span className="dsn-as__segs" role="group" aria-label="Shape">
                  {ORIENTATIONS.map(([o, label]) => (
                    <button key={o} type="button" aria-pressed={orient === o} disabled={drawing}
                            className={orient === o ? "is-on" : ""} onClick={() => setOrient(o)}>
                      {label}
                    </button>
                  ))}
                </span>
                <button type="submit" className="dsn-btn dsn-btn--solid" disabled={drawing || !prompt.trim()}>
                  {drawing ? `Drawing… ${secs}s` : "Generate"}
                </button>
              </div>
            </form>
            <p className="dsn-note">
              {drawing
                ? "This usually takes 20 to 40 seconds, and up to a minute for a large one. Keep this window open."
                : "Ask for a scene, not a slogan — any words in the picture will come out garbled. Every image you generate is saved to Your assets."}
            </p>
            {err && <p className="dsn-lib__err" role="status">{err}</p>}
            <div className="dsn-lib__grid dsn-as__grid">
              {made.map(card)}
            </div>
          </>
        )}

        {/* ── Stock ───────────────────────────────────────────────────── */}
        {tab === "stock" && (
          <>
            <form className="dsn-lib__search" onSubmit={(e) => { e.preventDefault(); void runStock(q); }}>
              <input ref={stockRef} className="hrx-input" value={q} onChange={(e) => setQ(e.target.value)}
                     placeholder="coffee shop interior, morning light" aria-label="Search stock photography" />
              <button type="submit" className="dsn-btn dsn-btn--solid" disabled={searching || !q.trim()}>
                {searching ? "Searching…" : "Search"}
              </button>
            </form>
            {err && <p className="dsn-lib__err" role="status">{err}</p>}
            {placing && (
              <p className="dsn-note" role="status">Saving the photo to your library…</p>
            )}
            <div className="dsn-lib__grid">
              {photos.map((im, i) => (
                <figure key={`${im.url}-${i}`}>
                  <button type="button" onClick={() => void pickStock(im)} disabled={placing !== null}
                          aria-busy={placing === im.url} aria-label={im.alt ?? "Use this photograph"}>
                    <img src={im.thumb ?? im.url} alt={im.alt ?? ""} loading="lazy" width={160} height={200} />
                  </button>
                  {/* The credit is part of the licence, not decoration. */}
                  {im.photographer && (
                    <figcaption>
                      <a href={im.photographerUrl} target="_blank" rel="noreferrer noopener">{im.photographer}</a>
                    </figcaption>
                  )}
                </figure>
              ))}
              {!photos.length && !searching && !err && (
                <p className="dsn-note">Search for what the picture should show. Free to use, credit shown.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
