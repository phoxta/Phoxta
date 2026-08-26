import { useEffect, useRef, useState } from "react";
import { generateImage, searchImages, type LibraryImage } from "@/lib/db/designs";

/**
 * Where a photograph comes from.
 *
 * Three sources behind one dialog, because from the editor's point of view
 * they answer the same question. Search is the default: it is free, instant,
 * and real photography beats a generated approximation for anything that
 * actually exists. Generation is for the picture that does not — a specific
 * product, a particular composition. Upload is for the one the business
 * already owns, which is the right answer more often than either.
 *
 * The photographer's credit travels with every Pexels result and is stored on
 * the design. That is not politeness: the licence requires attribution
 * wherever the photograph appears, and a design that carries the URL without
 * the name is a licence breach that nobody notices until it matters.
 */
export function ImageLibrary({ orgId, hint, onPick, onClose }: {
  orgId: string;
  /** What this slot is meant to show, used as the opening search. */
  hint?: string;
  onPick: (image: LibraryImage) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"search" | "generate" | "upload">("search");
  const [q, setQ] = useState(hint ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [photos, setPhotos] = useState<LibraryImage[]>([]);
  const [made, setMade] = useState<LibraryImage[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => { input.current?.focus(); }, [tab]);

  // The slot's own hint is the best first search anyone could type, so it runs
  // without being asked. An empty grid with a search box is a chore.
  useEffect(() => {
    if (hint) void run(hint);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(query: string) {
    if (!query.trim()) return;
    setBusy(true); setErr(null);
    const { data, error } = await searchImages(orgId, query);
    setBusy(false);
    if (error) return setErr(error);
    setPhotos(data);
    if (!data.length) setErr(`Nothing matched "${query}". Try fewer words.`);
  }

  async function make(query: string) {
    if (!query.trim()) return;
    setBusy(true); setErr(null);
    const { data, error } = await generateImage(orgId, query);
    setBusy(false);
    if (error) return setErr(error);
    if (data) setMade((m) => [data, ...m]);
  }

  const grid = tab === "generate" ? made : photos;

  return (
    <div className="dsn-modal" role="dialog" aria-modal="true" aria-label="Choose a photograph"
         onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dsn-modal__box dsn-lib">
        <header className="dsn-lib__head">
          <div className="dsn-lib__tabs" role="tablist">
            {(["search", "generate", "upload"] as const).map((t) => (
              <button key={t} type="button" role="tab" aria-selected={tab === t}
                      className={tab === t ? "is-on" : ""} onClick={() => { setTab(t); setErr(null); }}>
                {t === "search" ? "Stock photos" : t === "generate" ? "Generate" : "Upload"}
              </button>
            ))}
          </div>
          <button type="button" className="dsn-x" onClick={onClose} aria-label="Close">×</button>
        </header>

        {tab !== "upload" && (
          <form className="dsn-lib__search" onSubmit={(e) => {
            e.preventDefault();
            void (tab === "search" ? run(q) : make(q));
          }}>
            <input
              ref={input} className="hrx-input" value={q} onChange={(e) => setQ(e.target.value)}
              placeholder={tab === "search" ? "coffee shop interior, morning light" : "a flat-lay of artisan coffee beans on slate"}
              aria-label={tab === "search" ? "Search stock photography" : "Describe the image to generate"}
            />
            <button type="submit" className="dsn-btn dsn-btn--primary" disabled={busy || !q.trim()}>
              {busy ? (tab === "search" ? "Searching…" : "Drawing…") : tab === "search" ? "Search" : "Generate"}
            </button>
          </form>
        )}

        {tab === "generate" && (
          <p className="dsn-note">
            Generated pictures take a few seconds and are saved to this business's library.
            Ask for a scene, not a slogan — any words in the picture will come out garbled.
          </p>
        )}

        {tab === "upload" && (
          <div className="dsn-lib__drop">
            <input
              ref={file} type="file" accept="image/*" aria-label="Choose an image file"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                // Read straight to a data URI. The design stores it inline, so
                // an uploaded photograph works offline and in the export
                // without a round trip or a bucket to keep in sync.
                const fr = new FileReader();
                fr.onload = () => onPick({ url: String(fr.result), alt: f.name, source: "upload" });
                fr.readAsDataURL(f);
              }}
            />
            <p className="dsn-note">PNG or JPEG. It is stored with the design.</p>
          </div>
        )}

        {err && <p className="dsn-lib__err" role="status">{err}</p>}

        {tab !== "upload" && (
          <div className="dsn-lib__grid">
            {grid.map((im, i) => (
              <figure key={`${im.url}-${i}`}>
                <button type="button" onClick={() => onPick(im)} aria-label={im.alt ?? "Use this photograph"}>
                  <img src={im.thumb ?? im.url} alt={im.alt ?? ""} loading="lazy" width={160} height={200} />
                </button>
                {im.photographer && (
                  <figcaption>
                    <a href={im.photographerUrl} target="_blank" rel="noreferrer noopener">{im.photographer}</a>
                  </figcaption>
                )}
              </figure>
            ))}
            {!grid.length && !busy && !err && (
              <p className="dsn-note">
                {tab === "search" ? "Search for what the picture should show." : "Describe a picture and it will be drawn."}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
