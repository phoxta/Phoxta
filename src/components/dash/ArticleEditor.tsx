import {
  useRef, useState,
  type ChangeEvent, type DragEvent, type CSSProperties, type ElementType,
  type FocusEvent, type KeyboardEvent,
} from "react";
import { CATEGORY_LABELS, type ArticleBlock } from "@/data/articles";
import { estimateReadMinutes } from "@/lib/articleText";
import { type PostDraft } from "@/lib/db/platformPosts";

/**
 * The blog composer as the page itself.
 *
 * This renders the SAME markup and classes as blog-article/Section1 — the
 * breadcrumb, the title, the byline, the hero, every body block — so editing
 * happens on the exact page the reader will see, not a facsimile. Text is
 * edited in place (click and type), images are replaced by clicking them,
 * and blocks are added from a palette and reordered by dragging — the Studio
 * treatment applied to articles.
 *
 * The component owns no data: every commit flows up through onDraft/onBlocks,
 * and images go out through onUpload (which returns the hosted URL).
 */

type Props = {
  draft: PostDraft;
  blocks: ArticleBlock[];
  onDraft: (patch: Partial<PostDraft>) => void;
  onBlocks: (blocks: ArticleBlock[]) => void;
  onUpload: (file: File) => Promise<string | null>;
};

const CHEVRON_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" width="6" height="11" viewBox="0 0 6 11" fill="none">
    <path d="M0.666992 0.666672L5.33366 5.33334L0.666992 10" stroke="#585959" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** In-place text editing. Commits on blur; Enter commits unless multiline. */
function Editable({
  as, className, style, value, placeholder, multiline, onCommit,
}: {
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  value: string;
  placeholder?: string;
  multiline?: boolean;
  onCommit: (text: string) => void;
}) {
  const Tag = (as ?? "span") as ElementType;
  return (
    <Tag
      className={className}
      style={style}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      data-placeholder={placeholder ?? "Type here…"}
      onBlur={(e: FocusEvent<HTMLElement>) => {
        const t = e.currentTarget.innerText.replace(/\u00a0/g, " ").trim();
        if (t !== value) onCommit(t);
      }}
      onKeyDown={(e: KeyboardEvent<HTMLElement>) => {
        if (e.key === "Enter" && !multiline) { e.preventDefault(); (e.currentTarget as HTMLElement).blur(); }
        if (e.key === "Escape") (e.currentTarget as HTMLElement).blur();
      }}
    >
      {value}
    </Tag>
  );
}

/** What the "+" palette can insert. Images go through the upload picker. */
const PALETTE: { key: string; label: string; make?: () => ArticleBlock }[] = [
  { key: "lead", label: "Lead (standfirst)", make: () => ({ kind: "lead", text: "" }) },
  { key: "p", label: "Paragraph", make: () => ({ kind: "p", text: "" }) },
  { key: "h", label: "Heading", make: () => ({ kind: "h", text: "" }) },
  { key: "list", label: "Bullet list", make: () => ({ kind: "list", items: ["First point", "Second point"] }) },
  { key: "quote", label: "Pull quote", make: () => ({ kind: "quote", text: "" }) },
  { key: "figure", label: "Image" },
  { key: "duo", label: "Two columns", make: () => ({ kind: "duo", left: { h: "Left heading", p: "" }, right: { h: "Right heading", p: "" } }) },
  { key: "table", label: "Table", make: () => ({ kind: "table", head: ["Column A", "Column B"], rows: [["", ""]] }) },
];

export default function ArticleEditor({ draft, blocks, onDraft, onBlocks, onUpload }: Props) {
  const [paletteAt, setPaletteAt] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [busyImg, setBusyImg] = useState(false);
  const dragFrom = useRef<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  /** Where the next chosen file goes: the hero, a new figure, or an existing one. */
  const imgTarget = useRef<{ kind: "hero" } | { kind: "insert"; at: number } | { kind: "replace"; at: number }>({ kind: "hero" });

  const patch = (i: number, b: ArticleBlock) => onBlocks(blocks.map((x, j) => (j === i ? b : x)));
  const remove = (i: number) => onBlocks(blocks.filter((_, j) => j !== i));
  const insert = (i: number, b: ArticleBlock) => onBlocks([...blocks.slice(0, i), b, ...blocks.slice(i)]);
  const move = (from: number, to: number) => {
    if (from === to) return;
    const next = [...blocks];
    const [b] = next.splice(from, 1);
    next.splice(to > from ? to - 1 : to, 0, b);
    onBlocks(next);
  };

  function pick(target: typeof imgTarget.current) {
    imgTarget.current = target;
    fileInput.current?.click();
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setBusyImg(true);
    const url = await onUpload(f);
    setBusyImg(false);
    if (!url) return;
    const t = imgTarget.current;
    if (t.kind === "hero") onDraft({ hero: url });
    else if (t.kind === "insert") insert(t.at, { kind: "figure", img: url, alt: draft.title || "Article image" });
    else {
      const b = blocks[t.at];
      if (b?.kind === "figure") patch(t.at, { ...b, img: url });
    }
  }

  function addFromPalette(at: number, key: string) {
    setPaletteAt(null);
    if (key === "figure") { pick({ kind: "insert", at }); return; }
    const item = PALETTE.find((p) => p.key === key);
    if (item?.make) insert(at, item.make());
  }

  /** The slim "+" seam between blocks, with its palette. */
  function AddBar({ at }: { at: number }) {
    return (
      <div className="opx-addbar" data-open={paletteAt === at || undefined}>
        <button type="button" className="opx-addbtn" onClick={() => setPaletteAt(paletteAt === at ? null : at)} aria-label="Add a block here">+</button>
        {paletteAt === at && (
          <div className="opx-palette" role="menu">
            {PALETTE.map((p) => (
              <button key={p.key} type="button" role="menuitem" onClick={() => addFromPalette(at, p.key)}>{p.label}</button>
            ))}
          </div>
        )}
      </div>
    );
  }

  /** One block, rendered with the template's exact markup, edited in place. */
  function BlockEditor({ block, i }: { block: ArticleBlock; i: number }) {
    switch (block.kind) {
      case "lead":
        return <Editable as="h6" className="fz-font-2xl fw-400 mb-60" value={block.text} multiline placeholder="The opening standfirst…" onCommit={(t) => patch(i, { ...block, text: t })} />;
      case "p":
        return <Editable as="p" className="fz-font-lg neutral-900" value={block.text} multiline placeholder="Write a paragraph…" onCommit={(t) => patch(i, { ...block, text: t })} />;
      case "h":
        return <Editable as="h5" className="fw-600 mt-50 mb-20" value={block.text} placeholder="Section heading" onCommit={(t) => patch(i, { ...block, text: t })} />;
      case "list":
        return (
          <ul className="fz-font-lg neutral-900 ps-4 mb-40">
            {block.items.map((item, k) => (
              <li key={k} className="mb-2 opx-li">
                <Editable value={item} placeholder="List item — empty removes it" onCommit={(t) => {
                  const items = t ? block.items.map((x, j) => (j === k ? t : x)) : block.items.filter((_, j) => j !== k);
                  if (items.length === 0) remove(i); else patch(i, { ...block, items });
                }} />
              </li>
            ))}
            <li className="opx-li-add">
              <button type="button" onClick={() => patch(i, { ...block, items: [...block.items, "New point"] })}>+ item</button>
            </li>
          </ul>
        );
      case "quote":
        return (
          <blockquote className="border-start border-3 ps-4 my-50">
            <Editable as="p" className="fz-font-xl fw-500 neutral-900 fst-italic mb-2" value={block.text} multiline placeholder="A line worth quoting…" onCommit={(t) => patch(i, { ...block, text: t })} />
            <Editable as="cite" className="neutral-500 fz-font-sm fst-normal" value={block.cite ?? ""} placeholder="Attribution (optional)" onCommit={(t) => patch(i, { ...block, cite: t || undefined })} />
          </blockquote>
        );
      case "figure":
        return (
          <figure className="mt-60 mb-60">
            <div className="opx-imgwrap">
              <img src={block.img} alt={block.alt} width={1200} height={600} className="img-fluid" loading="lazy" />
              <button type="button" className="opx-imgswap" disabled={busyImg} onClick={() => pick({ kind: "replace", at: i })}>
                {busyImg ? "Uploading…" : "Replace image"}
              </button>
            </div>
            <Editable as="figcaption" className="text-center neutral-700 fst-italic mt-2" value={block.caption ?? ""} placeholder="Caption (optional)" onCommit={(t) => patch(i, { ...block, caption: t || undefined })} />
          </figure>
        );
      case "duo":
        return (
          <div className="row mb-60 mt-40">
            <div className="col-md-6">
              <Editable as="h6" className="fw-600" value={block.left.h} placeholder="Left heading" onCommit={(t) => patch(i, { ...block, left: { ...block.left, h: t } })} />
              <Editable as="p" className="fz-font-lg neutral-900" value={block.left.p} multiline placeholder="Left column text…" onCommit={(t) => patch(i, { ...block, left: { ...block.left, p: t } })} />
            </div>
            <div className="col-md-6">
              <Editable as="h6" className="fw-600" value={block.right.h} placeholder="Right heading" onCommit={(t) => patch(i, { ...block, right: { ...block.right, h: t } })} />
              <Editable as="p" className="fz-font-lg neutral-900" value={block.right.p} multiline placeholder="Right column text…" onCommit={(t) => patch(i, { ...block, right: { ...block.right, p: t } })} />
            </div>
          </div>
        );
      case "table": {
        const width = block.head.length;
        return (
          <figure className="mt-50 mb-60">
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    {block.head.map((h, c) => (
                      <th key={c} scope="col" className="fw-600 neutral-900">
                        <Editable value={h} placeholder="Header" onCommit={(t) => patch(i, { ...block, head: block.head.map((x, j) => (j === c ? t : x)) })} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, r) => (
                    <tr key={r}>
                      {row.map((cell, c) => (
                        <td key={c} className="neutral-900">
                          <Editable value={cell} placeholder="…" onCommit={(t) => patch(i, { ...block, rows: block.rows.map((rr, j) => (j === r ? rr.map((x, k) => (k === c ? t : x)) : rr)) })} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="opx-tabletools">
              <button type="button" onClick={() => patch(i, { ...block, rows: [...block.rows, Array(width).fill("")] })}>+ row</button>
              <button type="button" onClick={() => patch(i, { ...block, head: [...block.head, ""], rows: block.rows.map((r) => [...r, ""]) })}>+ column</button>
              {block.rows.length > 1 && <button type="button" onClick={() => patch(i, { ...block, rows: block.rows.slice(0, -1) })}>– row</button>}
              {width > 2 && <button type="button" onClick={() => patch(i, { ...block, head: block.head.slice(0, -1), rows: block.rows.map((r) => r.slice(0, -1)) })}>– column</button>}
            </div>
          </figure>
        );
      }
    }
  }

  const onDropAt = (i: number) => (e: DragEvent) => {
    e.preventDefault();
    if (dragFrom.current != null) move(dragFrom.current, i);
    dragFrom.current = null;
    setDragOver(null);
  };

  return (
    <section className="sec-1-blog-details overflow-hidden opx-canvas">
      <input ref={fileInput} type="file" accept="image/*" hidden onChange={onFile} />
      <div className="container">
        <div className="row align-items-center">
          <div className="col-lg-8 mx-auto">
            <div className="nav-menu d-flex align-items-center gap-2 pb-2">
              <span className="nav-menu__item neutral-900">Blog</span>
              <span className="nav-menu__item-separator">{CHEVRON_SVG}</span>
              <span className="nav-menu__item neutral-500">{CATEGORY_LABELS[draft.category]}</span>
            </div>
            <Editable as="h2" className="fw-600 lh-1 mb-0" value={draft.title} placeholder="Give the post a title…" onCommit={(t) => onDraft({ title: t })} />
            <div className="d-flex flex-column flex-md-row align-items-md-end gap-2 justify-content-between pt-30">
              <div className="d-flex align-items-center gap-2">
                <div>
                  <Editable as="h6" className="mb-0" value={draft.author} placeholder="Author" onCommit={(t) => onDraft({ author: t || "Phoxta" })} />
                  <span className="nav-menu__item fz-font-sm neutral-500">
                    {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} · {estimateReadMinutes(blocks)} min read
                  </span>
                </div>
              </div>
              <span className="nav-menu__item fz-font-label fw-600 neutral-500">SHARE THIS ARTICLE</span>
            </div>
          </div>

          <div className="col-12 py-5 text-center">
            <div className="opx-imgwrap d-inline-block">
              <img src={draft.hero} className="img-fluid" alt={draft.title} width={1720} height={789} style={{ width: "auto", height: "auto" }} loading="lazy" />
              <button type="button" className="opx-imgswap" disabled={busyImg} onClick={() => pick({ kind: "hero" })}>
                {busyImg ? "Uploading…" : "Replace hero image"}
              </button>
            </div>
          </div>

          <div className="col-lg-8 mx-auto">
            <div className="content">
              <AddBar at={0} />
              {blocks.map((block, i) => (
                <div
                  key={i}
                  className={`opx-block${dragOver === i ? " is-over" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(i); }}
                  onDragLeave={() => setDragOver((d) => (d === i ? null : d))}
                  onDrop={onDropAt(i)}
                >
                  <div className="opx-block-tools" contentEditable={false}>
                    <span
                      className="opx-drag" title="Drag to reorder" draggable
                      onDragStart={(e) => { dragFrom.current = i; e.dataTransfer.effectAllowed = "move"; }}
                      onDragEnd={() => { dragFrom.current = null; setDragOver(null); }}
                    >⠿</span>
                    <button type="button" title="Move up" disabled={i === 0} onClick={() => move(i, i - 1)}>↑</button>
                    <button type="button" title="Move down" disabled={i === blocks.length - 1} onClick={() => move(i, i + 2)}>↓</button>
                    <button type="button" className="opx-del" title="Delete block" onClick={() => remove(i)}>✕</button>
                  </div>
                  <BlockEditor block={block} i={i} />
                  <AddBar at={i + 1} />
                </div>
              ))}
              {blocks.length === 0 && (
                <p className="neutral-500 text-center py-4 mb-0">Empty page — use the “+” above to add the first block. The first paragraph should be a lead.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
