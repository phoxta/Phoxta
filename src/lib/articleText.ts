import { type ArticleBlock } from "@/data/articles";

/**
 * Plain-text ⇄ ArticleBlock[] for the console's blog composer.
 *
 * The blog template renders structured blocks, but nobody wants to write JSON
 * in a textarea. This dialect keeps the mapping obvious:
 *
 *   first paragraph          → lead (the large standfirst)
 *   ## Heading               → h
 *   - item (consecutive)     → list
 *   > quoted line            → quote
 *   ![alt](/path.webp|cap)   → figure (caption after "|" optional)
 *   :: Heading / text ×2     → duo (the template's paired columns)
 *   | a | b | rows           → table (first row is the header)
 *   anything else            → p
 *
 * Every template block round-trips, so a built-in editorial article can be
 * opened in the composer, edited and saved without losing its structure.
 * (The one lossy detail: a table's caption is dropped on serialise.)
 */

export function blocksToText(blocks: ArticleBlock[]): string {
  const out: string[] = [];
  for (const b of blocks) {
    switch (b.kind) {
      case "lead":
      case "p": out.push(b.text); break;
      case "h": out.push(`## ${b.text}`); break;
      case "list": out.push(b.items.map((i) => `- ${i}`).join("\n")); break;
      case "quote": out.push(`> ${b.text}`); break;
      case "figure": out.push(`![${b.alt}](${b.img}${b.caption ? `|${b.caption}` : ""})`); break;
      case "duo":
        out.push(`:: ${b.left.h}\n${b.left.p}\n:: ${b.right.h}\n${b.right.p}`);
        break;
      case "table":
        out.push([b.head, ...b.rows].map((r) => `| ${r.join(" | ")} |`).join("\n"));
        break;
    }
  }
  return out.join("\n\n");
}

export function textToBlocks(text: string): ArticleBlock[] {
  const chunks = text.replace(/\r\n/g, "\n").split(/\n{2,}/).map((c) => c.trim()).filter(Boolean);
  const blocks: ArticleBlock[] = [];
  let leadDone = false;

  for (const chunk of chunks) {
    if (chunk.startsWith("## ")) {
      blocks.push({ kind: "h", text: chunk.slice(3).trim() });
      continue;
    }
    if (chunk.startsWith("> ")) {
      blocks.push({ kind: "quote", text: chunk.replace(/^>\s?/gm, "").trim() });
      continue;
    }
    const fig = chunk.match(/^!\[(.*?)\]\((.+?)\)$/);
    if (fig) {
      const [img, caption] = fig[2].split("|");
      blocks.push({ kind: "figure", img: img.trim(), alt: fig[1] || "Article image", caption: caption?.trim() || undefined });
      continue;
    }
    if (/^- /m.test(chunk) && chunk.split("\n").every((l) => l.startsWith("- "))) {
      blocks.push({ kind: "list", items: chunk.split("\n").map((l) => l.slice(2).trim()).filter(Boolean) });
      continue;
    }
    // Paired columns: ":: Heading" starts a column, following lines are its text.
    if (chunk.startsWith(":: ")) {
      const cols: { h: string; p: string }[] = [];
      for (const line of chunk.split("\n")) {
        if (line.startsWith(":: ")) cols.push({ h: line.slice(3).trim(), p: "" });
        else if (cols.length) cols[cols.length - 1].p += (cols[cols.length - 1].p ? " " : "") + line.trim();
      }
      if (cols.length === 2) {
        blocks.push({ kind: "duo", left: cols[0], right: cols[1] });
      } else {
        // Not a pair — keep the content readable as heading + paragraph runs.
        for (const c of cols) {
          blocks.push({ kind: "h", text: c.h });
          if (c.p) blocks.push({ kind: "p", text: c.p });
        }
      }
      continue;
    }
    // Table: every line piped; a markdown |---| separator row is ignored.
    if (chunk.split("\n").every((l) => l.trim().startsWith("|"))) {
      const rows = chunk.split("\n")
        .map((l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()))
        .filter((r) => !r.every((c) => /^:?-{2,}:?$/.test(c) || c === ""));
      if (rows.length >= 2) {
        blocks.push({ kind: "table", head: rows[0], rows: rows.slice(1) });
        continue;
      }
    }
    if (!leadDone) {
      blocks.push({ kind: "lead", text: chunk });
      leadDone = true;
    } else {
      blocks.push({ kind: "p", text: chunk });
    }
  }
  return blocks;
}

/** Honest read-time from the words actually written. */
export function estimateReadMinutes(blocks: ArticleBlock[]): number {
  const words = blocksToText(blocks).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
