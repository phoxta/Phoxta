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
 *   anything else            → p
 *
 * Blocks the console cannot author (duo, table) degrade to readable text when
 * serialised, so editing an imported post never throws content away silently.
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
        out.push(`## ${b.left.h}`, b.left.p, `## ${b.right.h}`, b.right.p);
        break;
      case "table":
        out.push([b.head.join(" — "), ...b.rows.map((r) => r.join(" — "))].join("\n"));
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
