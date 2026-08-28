import { useRef, useState } from "react";
import { DesignSvg } from "@/lib/designs/render";
import { slidesOf } from "@/lib/designs/types";
import type { Design } from "@/lib/db/designs";
import type { InstagramOptions as Options } from "@/lib/db/ops/social";

/**
 * The Instagram-only part of composing a post.
 *
 * WHY THIS IS NOT FOUR CHECKBOXES FOR FOUR PLATFORMS. Every control here maps
 * to a parameter Instagram's publishing API actually accepts, and none of the
 * other three has an equivalent: LinkedIn has no co-author field at all, X and
 * TikTok neither tag on the image nor take alt text. A row of controls that
 * appeared for every channel and did something on one of them would be a
 * promise the publisher cannot keep, and the owner would only find out by
 * looking at the post afterwards.
 *
 * WHAT IS DELIBERATELY ABSENT, because the API has no way to do it:
 *   · Music. The Instagram music library is not exposed to any API — the only
 *     audio field is `audio_name`, which renames a reel's own audio track.
 *   · Sharing an existing post to the story. That button lives in the app.
 *     Publishing a story of its own IS possible, which is what "Put it on the
 *     story too" does: the same picture, posted twice.
 *   · Crossposting to a Facebook Page. That is not an Instagram parameter; it
 *     is a separate Page connection with its own login and permissions.
 *   · Stickers, polls, countdowns and link stickers on the story.
 *
 * TAGGING IS DONE ON THE PICTURE because Instagram wants coordinates, not just
 * names — x and y from 0 to 1, and a tag with no position is refused. Asking
 * someone to type two numbers would be absurd, so the design is rendered by the
 * same renderer the editor uses and a click on it IS the coordinate.
 */
export function InstagramOptions({ design, value, onChange }: {
  design: Design;
  value: Options;
  onChange: (v: Options) => void;
}) {
  const [collab, setCollab] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const dragging = useRef<number | null>(null);

  const doc = slidesOf(design.doc, design.template_id)[0];
  const set = (patch: Partial<Options>) => onChange({ ...value, ...patch });

  /** Where a pointer is, as a fraction of the picture. Clamped, because a drag
   *  that leaves the box would otherwise send Instagram a coordinate it
   *  refuses — and it refuses the whole post, not the tag. */
  const at = (e: { clientX: number; clientY: number }) => {
    const r = box.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    };
  };

  const addTag = (e: React.PointerEvent) => {
    if (value.userTags.length >= 20) return;
    const { x, y } = at(e);
    set({ userTags: [...value.userTags, { username: "", x, y }] });
  };

  const moveTag = (e: React.PointerEvent) => {
    if (dragging.current === null) return;
    const { x, y } = at(e);
    const i = dragging.current;
    set({ userTags: value.userTags.map((t, n) => (n === i ? { ...t, x, y } : t)) });
  };

  const addCollab = () => {
    const name = collab.trim().replace(/^@+/, "");
    if (!name || value.collaborators.length >= 3) return;
    if (value.collaborators.some((c) => c.toLowerCase() === name.toLowerCase())) return setCollab("");
    set({ collaborators: [...value.collaborators, name] });
    setCollab("");
  };

  return (
    <div className="igo">
      <p className="igo__lead">Instagram</p>

      {/* ── co-authors ───────────────────────────────────────────────────── */}
      <label className="emc__f">
        <span>Collaborate with</span>
        <div className="igo__chips">
          {value.collaborators.map((c) => (
            <span key={c} className="igo__chip">
              @{c}
              <button type="button" aria-label={`Remove ${c}`}
                      onClick={() => set({ collaborators: value.collaborators.filter((x) => x !== c) })}>×</button>
            </span>
          ))}
          {value.collaborators.length < 3 && (
            <span className="igo__add">
              <input
                value={collab}
                onChange={(e) => setCollab(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCollab(); } }}
                placeholder="username"
                aria-label="Add a collaborator"
              />
              <button type="button" onClick={addCollab} disabled={!collab.trim()}>Add</button>
            </span>
          )}
        </div>
        <em>
          Up to three, and they have to accept before it appears on their profile. Public accounts
          only — Instagram refuses a private one.
        </em>
      </label>

      {/* ── tagging, on the picture ──────────────────────────────────────── */}
      <label className="emc__f">
        <span>Tag people</span>
        <div
          ref={box}
          className="igo__pic"
          onPointerDown={addTag}
          onPointerMove={moveTag}
          onPointerUp={() => { dragging.current = null; }}
          onPointerLeave={() => { dragging.current = null; }}
        >
          <DesignSvg doc={doc} width={240} />
          {value.userTags.map((t, i) => (
            <span
              key={i}
              className="igo__pin"
              style={{ left: `${t.x * 100}%`, top: `${t.y * 100}%` }}
              title={t.username ? `@${t.username}` : "Who is this?"}
              onPointerDown={(e) => { e.stopPropagation(); dragging.current = i; }}
            >
              {i + 1}
            </span>
          ))}
        </div>
        {value.userTags.length === 0 ? (
          <em>Click the picture where someone is, then say who.</em>
        ) : (
          <div className="igo__tags">
            {value.userTags.map((t, i) => (
              <span key={i} className="igo__tag">
                <b>{i + 1}</b>
                <input
                  value={t.username}
                  onChange={(e) => set({
                    userTags: value.userTags.map((x, n) =>
                      n === i ? { ...x, username: e.target.value.replace(/^@+/, "") } : x),
                  })}
                  placeholder="username"
                  aria-label={`Who is at pin ${i + 1}`}
                />
                <button type="button" aria-label={`Remove pin ${i + 1}`}
                        onClick={() => set({ userTags: value.userTags.filter((_, n) => n !== i) })}>×</button>
              </span>
            ))}
            <em>Drag a pin to move it. One with no name is dropped.</em>
          </div>
        )}
      </label>

      {/* ── alt text ─────────────────────────────────────────────────────── */}
      <label className="emc__f">
        <span>
          Describe the picture
          <span style={{ float: "right", fontWeight: 400, color: "var(--hrx-muted)" }}>
            {value.altText.length}/1000
          </span>
        </span>
        <textarea
          rows={2}
          value={value.altText}
          maxLength={1000}
          onChange={(e) => set({ altText: e.target.value })}
          placeholder="What someone would miss if they could not see it."
        />
        <em>Read out by a screen reader, and it is what Instagram reads to work out what the post is about.</em>
      </label>

      {/* ── the story ────────────────────────────────────────────────────── */}
      <label className="igo__check">
        <input type="checkbox" checked={value.alsoStory}
               onChange={(e) => set({ alsoStory: e.target.checked })} />
        <span>
          Put it on the story too
          <em>
            Posted as its own story, right after the feed post — the same picture, without the
            caption. Instagram has no way to share the feed post itself to a story.
          </em>
        </span>
      </label>

      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
.igo{border:1px solid var(--hrx-border);border-radius:14px;padding:12px 14px;margin-top:4px;background:var(--hrx-card)}
.igo__lead{font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--hrx-muted);margin:0 0 8px}
.igo__chips{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.igo__chip{display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border-radius:999px;
           background:var(--hrx-bg);border:1px solid var(--hrx-border);font-size:13px}
.igo__chip button,.igo__tag button{border:0;background:none;cursor:pointer;font-size:15px;line-height:1;color:var(--hrx-muted);padding:0 2px}
.igo__chip button:hover,.igo__tag button:hover{color:#D63D0B}
.igo__add{display:inline-flex;gap:4px}
.igo__add input{width:130px;height:30px;border:1px solid var(--hrx-border);border-radius:8px;padding:0 8px;font-size:13px;background:var(--hrx-bg);color:var(--hrx-ink)}
.igo__add button{height:30px;padding:0 10px;border:1px solid var(--hrx-border);border-radius:8px;background:var(--hrx-bg);cursor:pointer;font-size:13px;color:var(--hrx-ink)}
.igo__add button:disabled{opacity:.45;cursor:default}
.igo__pic{position:relative;width:240px;max-width:100%;border-radius:10px;overflow:hidden;
          border:1px solid var(--hrx-border);cursor:crosshair;touch-action:none;user-select:none}
.igo__pic svg{display:block;width:100%;height:auto}
.igo__pin{position:absolute;transform:translate(-50%,-50%);min-width:20px;height:20px;border-radius:999px;
          background:#1D1D1D;color:#fff;font-size:11px;font-weight:700;display:inline-flex;
          align-items:center;justify-content:center;cursor:grab;box-shadow:0 0 0 2px #fff}
.igo__tags{display:flex;flex-direction:column;gap:5px;margin-top:6px}
.igo__tag{display:inline-flex;align-items:center;gap:6px}
.igo__tag b{width:20px;height:20px;border-radius:999px;background:#1D1D1D;color:#fff;font-size:11px;
            display:inline-flex;align-items:center;justify-content:center;flex:none}
.igo__tag input{flex:1;max-width:220px;height:30px;border:1px solid var(--hrx-border);border-radius:8px;
                padding:0 8px;font-size:13px;background:var(--hrx-bg);color:var(--hrx-ink)}
.igo__check{display:flex;gap:9px;align-items:flex-start;margin-top:10px;cursor:pointer}
.igo__check input{margin-top:3px}
.igo__check span{font-size:13.5px;color:var(--hrx-ink)}
.igo__check em{display:block;font-style:normal;font-size:12.5px;color:var(--hrx-muted);margin-top:2px}
`;
