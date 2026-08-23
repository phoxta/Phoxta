// GENERATED FILE — do not edit.
// Source: packages/shared-chat/src/chatRich.tsx
// Update that file, then run: npm run shared:sync
import type { ReactNode } from "react";

/**
 * Rich rendering for storefront chat.
 *
 * The agent writes markdown — it emits "**Herb-Crusted Salmon**" whether or not
 * anything renders it — and the widgets printed the raw string, so customers saw
 * the asterisks. It also had no way to show a product: recommend_products
 * returned name/description/price and nothing else, so the model could describe
 * a dish but never picture it.
 *
 * This renders the text as React nodes rather than HTML. The agent's output is
 * partly derived from customer input, so injecting it with dangerouslySetInnerHTML
 * would turn a prompt-injection into stored XSS. Building elements keeps that
 * impossible by construction — the trade is that only a deliberate subset of
 * markdown is supported, which is the right trade for a chat bubble.
 */

export type ChatCard = {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  currency: string;
  image_url: string | null;
};

const money = (cents: number, ccy: string) => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: ccy || "GBP" }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)}`;
  }
};

// **bold** · *italic* · `code` · [label](url) · bare http(s) links
const INLINE = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|https?:\/\/[^\s)]+)/g;

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  let i = 0;
  for (const part of text.split(INLINE)) {
    if (!part) continue;
    const k = `${keyBase}-${i++}`;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      out.push(<strong key={k}>{part.slice(2, -2)}</strong>);
    } else if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      out.push(<code key={k}>{part.slice(1, -1)}</code>);
    } else if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      out.push(<em key={k}>{part.slice(1, -1)}</em>);
    } else if (part.startsWith("[")) {
      const m = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
      // Only http(s) — a [click me](javascript:…) label must never become a link.
      if (m && /^https?:\/\//i.test(m[2])) {
        out.push(<a key={k} href={m[2]} target="_blank" rel="noreferrer noopener">{m[1]}</a>);
      } else {
        out.push(<span key={k}>{part}</span>);
      }
    } else if (/^https?:\/\//i.test(part)) {
      out.push(<a key={k} href={part} target="_blank" rel="noreferrer noopener">{part}</a>);
    } else {
      out.push(<span key={k}>{part}</span>);
    }
  }
  return out;
}

/** Agent text with markdown emphasis, links and bullet lists honoured. */
export function RichText({ text }: { text: string }) {
  const lines = (text ?? "").split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];

  const flush = (key: string) => {
    if (!bullets.length) return;
    blocks.push(
      <ul key={key} style={{ margin: "6px 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
        {bullets.map((b, i) => <li key={i}>{inline(b, `${key}-${i}`)}</li>)}
      </ul>,
    );
    bullets = [];
  };

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      bullets.push((bullet ?? numbered)![1]);
      return;
    }
    flush(`ul-${idx}`);
    if (!line.trim()) return;
    blocks.push(<p key={`p-${idx}`} style={{ margin: "4px 0" }}>{inline(line, `p-${idx}`)}</p>);
  });
  flush("ul-end");

  return <>{blocks}</>;
}

/** Products the agent referenced, as real cards with the picture and price. */
export function ProductCards({ cards }: { cards?: ChatCard[] }) {
  if (!cards?.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
      {cards.map((c) => (
        <div
          key={c.id}
          style={{
            display: "flex", gap: 10, alignItems: "center", padding: 8,
            border: "1px solid rgba(0,0,0,.10)", borderRadius: 10, background: "rgba(255,255,255,.65)",
          }}
        >
          {c.image_url ? (
            <img
              src={c.image_url}
              alt={c.name}
              width={56}
              height={56}
              loading="lazy"
              style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, flexShrink: 0 }}
            />
          ) : null}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>{c.name}</div>
            {c.description ? (
              <div style={{ fontSize: 11, opacity: 0.7, lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {c.description}
              </div>
            ) : null}
            {c.price_cents > 0 ? (
              <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2 }}>{money(c.price_cents, c.currency)}</div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
