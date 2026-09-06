import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconSearch } from "@/lib/icons";
import { useCatalog, useMoney } from "@/state/catalog";
import { useUi } from "@/state/ui";

/** ⌘K search over the live catalogue — name, strapline, category and the skin
 *  concerns a product treats, which is how people actually shop for skincare
 *  ("redness", not "cream"). */
export default function SearchPalette() {
    const { overlay, close, open } = useUi();
    const { products } = useCatalog();
    const money = useMoney();
    const navigate = useNavigate();
    const [query, setQuery] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const isOpen = overlay === "search";

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                open("search");
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open]);

    useEffect(() => {
        if (isOpen) {
            setQuery("");
            // The palette mounts hidden, so focus has to wait for the paint that
            // reveals it.
            const t = window.setTimeout(() => inputRef.current?.focus(), 50);
            return () => window.clearTimeout(t);
        }
    }, [isOpen]);

    const hits = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return [];
        return products.filter((p) =>
            [p.name, p.tagline, p.category, ...p.concerns].join(" ").toLowerCase().includes(q),
        );
    }, [products, query]);

    if (!isOpen) return null;

    const goToResults = () => {
        const q = query.trim();
        if (!q) return;
        close();
        navigate(`/shop?q=${encodeURIComponent(q)}`);
    };

    return (
        <div className="search-box open" role="dialog" aria-modal="true" aria-label="Search products">
            <div className="in">
                <IconSearch />
                <input
                    ref={inputRef}
                    type="search"
                    value={query}
                    placeholder="Search products, concerns…"
                    aria-label="Search"
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") goToResults();
                    }}
                />
                <kbd>ESC</kbd>
            </div>
            <div className="res">
                {!query.trim() ? (
                    <div className="hint">Try &ldquo;oil&rdquo;, &ldquo;cleanser&rdquo;, &ldquo;redness&rdquo; or &ldquo;set&rdquo;</div>
                ) : hits.length === 0 ? (
                    <div className="hint">No products match &ldquo;{query.trim()}&rdquo;.</div>
                ) : (
                    <>
                        {hits.map((p) => (
                            <button
                                type="button"
                                key={p.id}
                                onClick={() => {
                                    close();
                                    navigate(`/product/${p.slug}`);
                                }}
                            >
                                <img src={p.img} alt="" width={44} height={52} loading="lazy" />
                                <div>
                                    <b>{p.name}</b>
                                    <small>{p.tagline}</small>
                                </div>
                                <span className="p">{money(p.priceCents)}</span>
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={goToResults}
                            style={{ justifyContent: "center", fontWeight: 600, fontSize: 13 }}
                        >
                            See all results for &ldquo;{query.trim()}&rdquo; →
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
