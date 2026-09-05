import type { ReactNode } from "react";
import { formatMoney } from "@/lib/format";

/**
 * Rich rendering for storefront chat.
 *
 * The agent writes markdown; this renders a deliberate subset of it as React
 * nodes rather than HTML. The agent's output is partly derived from customer
 * input, so injecting it with dangerouslySetInnerHTML would turn a prompt
 * injection into stored XSS. Building elements makes that impossible by
 * construction.
 *
 * Mirrors packages/shared-chat/src/chatRich.tsx; keep the rendering rules in
 * step with the other storefronts.
 */

/** A call-to-action on a card. http(s) only — anything else is dropped at render. */
export interface ChatCardLink {
    label: string;
    url: string;
}

export interface ChatCard {
    id: string;
    name: string;
    description: string;
    price_cents: number;
    currency: string;
    image_url: string | null;
    /** Optional strapline shown under the name; falls back to description. */
    tagline?: string | null;
    /** Optional links rendered as buttons that open in a new tab. */
    links?: ChatCardLink[];
}

/** Inline media attached to an agent reply. */
export interface ChatMedia {
    type: "image";
    url: string;
    alt?: string;
}

const httpOnly = (u: string) => /^https?:\/\//i.test(u);

/** Image src guard: absolute http(s) or same-site path — never javascript: etc. */
const safeSrc = (u: string | null | undefined): string | null =>
    u && (httpOnly(u) || u.startsWith("/")) ? u : null;

const money = (cents: number, ccy: string) => {
    try {
        return formatMoney(cents, ccy);
    } catch {
        return (cents / 100).toFixed(2);
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
            if (m && httpOnly(m[2])) {
                out.push(
                    <a key={k} href={m[2]} target="_blank" rel="noreferrer noopener">
                        {m[1]}
                    </a>,
                );
            } else {
                out.push(<span key={k}>{part}</span>);
            }
        } else if (httpOnly(part)) {
            // Trailing punctuation belongs to the sentence, not the href.
            const url = part.replace(/[.,;:!?]+$/, "");
            out.push(
                <a key={k} href={url} target="_blank" rel="noreferrer noopener">
                    {url}
                </a>,
            );
            if (url.length < part.length) out.push(<span key={`${k}-tail`}>{part.slice(url.length)}</span>);
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
                {bullets.map((b, i) => (
                    <li key={i}>{inline(b, `${key}-${i}`)}</li>
                ))}
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
        // "## Heading" would otherwise print its hash marks — render it bold instead.
        const heading = /^\s*#{1,4}\s+(.*)$/.exec(line);
        if (heading) {
            blocks.push(
                <p key={`h-${idx}`} style={{ margin: "6px 0 2px", fontWeight: 600 }}>
                    {inline(heading[1], `h-${idx}`)}
                </p>,
            );
            return;
        }
        blocks.push(
            <p key={`p-${idx}`} style={{ margin: "4px 0" }}>
                {inline(line, `p-${idx}`)}
            </p>,
        );
    });
    flush("ul-end");

    return <>{blocks}</>;
}

/**
 * Products the agent referenced, as real cards with picture and price.
 * Multiple cards render as a horizontally scrollable snap row; one card fills
 * the bubble's width.
 */
export function ProductCards({ cards }: { cards?: ChatCard[] }) {
    if (!cards?.length) return null;
    const many = cards.length > 1;
    return (
        <div
            className="chat-cards-row"
            style={{
                display: "flex",
                gap: 10,
                marginTop: 10,
                overflowX: many ? "auto" : "visible",
                scrollSnapType: many ? "x mandatory" : undefined,
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                WebkitOverflowScrolling: "touch",
                paddingBottom: 2,
            }}
        >
            {/* Self-contained: no stylesheet ships with this module. */}
            <style>{".chat-cards-row::-webkit-scrollbar{display:none}"}</style>
            {cards.map((c) => {
                const img = safeSrc(c.image_url);
                const tagline = (c.tagline ?? "").trim() || c.description;
                const links = (c.links ?? []).filter((l) => l.label && httpOnly(l.url));
                return (
                    <div
                        key={c.id}
                        className="chat-card"
                        style={{
                            flex: many ? "0 0 216px" : "1 1 auto",
                            width: many ? 216 : "100%",
                            minWidth: 0,
                            scrollSnapAlign: many ? "start" : undefined,
                            display: "flex",
                            flexDirection: "column",
                            border: "1px solid rgba(0,0,0,.10)",
                            borderRadius: 12,
                            overflow: "hidden",
                            background: "rgba(255,255,255,.85)",
                        }}
                    >
                        {img ? (
                            <img
                                src={img}
                                alt={c.name}
                                width={320}
                                height={200}
                                loading="lazy"
                                style={{ width: "100%", height: "auto", aspectRatio: "16 / 10", objectFit: "cover", display: "block" }}
                            />
                        ) : (
                            <div
                                aria-hidden="true"
                                style={{
                                    width: "100%",
                                    aspectRatio: "16 / 10",
                                    background: "linear-gradient(135deg, rgba(0,0,0,.05), rgba(0,0,0,.14))",
                                }}
                            />
                        )}
                        <div style={{ padding: "8px 10px 10px", display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                                <div
                                    style={{
                                        fontWeight: 600,
                                        fontSize: 13,
                                        lineHeight: 1.3,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {c.name}
                                </div>
                                {c.price_cents > 0 ? (
                                    <span
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            padding: "2px 8px",
                                            borderRadius: 999,
                                            background: "rgba(0,0,0,.08)",
                                            whiteSpace: "nowrap",
                                            flexShrink: 0,
                                        }}
                                    >
                                        {money(c.price_cents, c.currency)}
                                    </span>
                                ) : null}
                            </div>
                            {tagline ? (
                                <div
                                    style={{
                                        fontSize: 11,
                                        opacity: 0.7,
                                        lineHeight: 1.4,
                                        display: "-webkit-box",
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: "vertical",
                                        overflow: "hidden",
                                    }}
                                >
                                    {tagline}
                                </div>
                            ) : null}
                            {links.length ? (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                                    {links.map((l, i) => {
                                        const primary = i === links.length - 1;
                                        return (
                                            <a
                                                key={`${c.id}-link-${i}`}
                                                href={l.url}
                                                target="_blank"
                                                rel="noreferrer noopener"
                                                style={{
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    padding: "5px 10px",
                                                    borderRadius: 999,
                                                    textDecoration: "none",
                                                    border: "1px solid rgba(0,0,0,.8)",
                                                    background: primary ? "rgba(17,17,17,1)" : "transparent",
                                                    color: primary ? "#fff" : "inherit",
                                                }}
                                            >
                                                {l.label}
                                            </a>
                                        );
                                    })}
                                </div>
                            ) : null}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/** Inline images the agent's tools attached to the reply, under the text. */
export function MediaRow({ media }: { media?: ChatMedia[] }) {
    const imgs = (media ?? []).filter((m) => m?.type === "image" && safeSrc(m.url));
    if (!imgs.length) return null;
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
            {imgs.map((m, i) => (
                <img
                    key={`media-${i}`}
                    src={m.url}
                    alt={m.alt ?? ""}
                    loading="lazy"
                    style={{ maxWidth: "100%", height: "auto", borderRadius: 10, display: "block" }}
                />
            ))}
        </div>
    );
}
