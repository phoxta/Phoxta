import { useEffect, useMemo, useRef, useState } from "react";
import { toastError } from "@/lib/ops/feedback";
import { listPlatformPosts, type PlatformPost } from "@/lib/db/platformPosts";
import { PRESETS, type Draft } from "./emailPresets";

/**
 * Where an email starts.
 *
 * The same shape as the graphics Templates dialog, and for the same reason:
 * you choose once per email and then never look at it again, so it does not
 * deserve a permanent strip across the top of the page.
 *
 * Published blog posts are in here with the presets rather than behind their
 * own button. A post IS a starting point — the difference between it and
 * "Newsletter" is what is already written in the blocks, not what kind of
 * thing it is — and two buttons that both mean "start one" is one button too
 * many.
 */
export function EmailTemplatePicker({ onPickPreset, onPickPost, onClose }: {
  onPickPreset: (d: Draft) => void;
  onPickPost: (slug: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [posts, setPosts] = useState<PlatformPost[]>([]);
  const [loading, setLoading] = useState(true);
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => {
    search.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  useEffect(() => {
    void (async () => {
      const { posts, error } = await listPlatformPosts();
      if (error) toastError(error);
      setPosts(posts.filter((p) => p.status === "published"));
      setLoading(false);
    })();
  }, []);

  const needle = q.trim().toLowerCase();
  const shownPresets = useMemo(
    () => (needle ? PRESETS.filter((p) => `${p.name} ${p.what}`.toLowerCase().includes(needle)) : PRESETS),
    [needle],
  );
  const shownPosts = useMemo(
    () => (needle ? posts.filter((p) => `${p.title} ${p.excerpt}`.toLowerCase().includes(needle)) : posts),
    [needle, posts],
  );

  return (
    <div className="dsn-modal" role="dialog" aria-modal="true" aria-label="Choose a starting point"
         onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dsn-modal__box dsn-picker">
        <header className="dsn-picker__head">
          <div style={{ minWidth: 0 }}>
            <h3 className="dsn-picker__t">Start from a template</h3>
            <p className="dsn-note">
              A shape to fill in, or a published post to send as the post itself.
            </p>
          </div>
          <input
            ref={search}
            className="hrx-input dsn-input"
            style={{ maxWidth: 240 }}
            placeholder="Search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </header>

        <div className="emt-scroll">
          <h4 className="emt-group">Shapes</h4>
          <div className="emt-grid">
            {shownPresets.map((p) => (
              <button key={p.id} type="button" className="emt-card" onClick={() => onPickPreset(p.make())}>
                <strong>{p.name}</strong>
                <span>{p.what}</span>
              </button>
            ))}
          </div>

          <h4 className="emt-group">From the blog</h4>
          {loading ? (
            <p className="dsn-note">Loading…</p>
          ) : shownPosts.length === 0 ? (
            <p className="dsn-note">
              {posts.length === 0
                ? "No posts written in the console yet — the blog's built-in articles live in the code, so they are not here. Write one under Platform → Blog and it will be."
                : "No posts match that."}
            </p>
          ) : (
            <div className="emt-grid">
              {shownPosts.map((p) => (
                <button key={p.id} type="button" className="emt-card" onClick={() => onPickPost(p.slug)}>
                  <strong>{p.title}</strong>
                  <span>{p.excerpt}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
.emt-scroll{overflow-y:auto;padding-right:4px}
.emt-group{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--hrx-muted);margin:14px 0 8px}
.emt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px}
.emt-card{text-align:left;padding:12px 14px;border:1px solid var(--hrx-border);border-radius:12px;background:var(--hrx-card);cursor:pointer}
.emt-card:hover{border-color:var(--hrx-ink)}
.emt-card strong{display:block;font-size:14px;font-weight:600;color:var(--hrx-ink)}
.emt-card span{display:block;font-size:12.5px;line-height:1.45;color:var(--hrx-muted);margin-top:3px}
`;
