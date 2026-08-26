// Phoxta — stock photography for the validation slides.
//
// WHY THIS IS SERVER-SIDE
//
// PEXELS_API_KEY has no VITE_ prefix, which is deliberate: anything Vite is
// allowed to inline ends up readable in the JavaScript bundle, and a key in a
// bundle is a key that has been published. So the search happens here, the
// answer is stored on the idea, and the browser only ever receives a URL.
//
// It also means one search per step for the life of the idea rather than one
// per render — a slide that is reopened fifty times does not spend fifty calls
// against an hourly quota.
//
// ATTRIBUTION IS NOT OPTIONAL. The Pexels licence requires the photographer to
// be credited wherever the photo appears, so the photographer's name and profile
// URL are stored alongside the image and the slide renders them. Storing the URL
// without the credit would make every slide a licence breach.

export type StockImage = {
  url: string;
  /** A wider crop of the same photograph, for a full-width card. */
  urlWide: string;
  alt: string;
  photographer: string;
  photographerUrl: string;
  /** A small version, for a picker grid. */
  thumb?: string;
  /** Where it came from, so a future second source stays distinguishable. */
  source: "pexels";
};

type PexelsPhoto = {
  alt?: string;
  photographer?: string;
  photographer_url?: string;
  src?: Record<string, string>;
};

/**
 * Find a photograph for `query`.
 *
 * Returns null rather than throwing on every failure path — no key, a bad
 * response, a rate limit, a query nothing matches. The caller already has a
 * curated fallback on the slide, and losing a whole validation step because a
 * photo service was briefly unavailable would be an absurd trade.
 */
export async function searchStock(query: string): Promise<StockImage | null> {
  const key = Deno.env.get("PEXELS_API_KEY");
  const q = query.trim();
  if (!key || !q) return null;

  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?per_page=5&orientation=landscape&size=medium&query=${encodeURIComponent(q)}`,
      { headers: { Authorization: key } },
    );
    if (!res.ok) return null;

    const data = await res.json() as { photos?: PexelsPhoto[] };
    const photos = data.photos ?? [];
    if (photos.length === 0) return null;

    // Not photos[0]. Pexels orders by relevance, and the top hit for a business
    // query is very often the most generic stock frame in the set — the one
    // every other deck already uses. The second is nearly as relevant and much
    // less worn. Deterministic, so re-resolving the same query is idempotent.
    const pick = photos[Math.min(1, photos.length - 1)];
    const src = pick.src ?? {};
    const url = src.large ?? src.landscape ?? src.original;
    if (!url) return null;

    return {
      url,
      urlWide: src.landscape ?? url,
      alt: (pick.alt ?? q).slice(0, 200),
      photographer: (pick.photographer ?? "Pexels").slice(0, 120),
      photographerUrl: pick.photographer_url ?? "https://www.pexels.com",
      source: "pexels",
    };
  } catch {
    return null;
  }
}

/**
 * A page of results, for a picker.
 *
 * searchStock above answers "give me the one good photograph for this", which
 * is what an automated slide needs. A person choosing for themselves needs the
 * opposite: everything that matched, in relevance order, including the generic
 * first hit that the automatic path deliberately skips — when someone is
 * looking at the grid, the most obvious frame is a legitimate choice and
 * hiding it would be second-guessing them.
 *
 * Both orientations are returned rather than forcing landscape: the pack's
 * photo slots include tall cut-out figures, and a landscape-only search fills
 * them with something that has to be cropped to nothing.
 */
export async function searchStockMany(query: string, perPage = 24): Promise<StockImage[]> {
  const key = Deno.env.get("PEXELS_API_KEY");
  const q = query.trim();
  if (!key || !q) return [];

  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?per_page=${Math.min(80, Math.max(1, perPage))}&query=${encodeURIComponent(q)}`,
      { headers: { Authorization: key } },
    );
    if (!res.ok) return [];
    const data = await res.json() as { photos?: PexelsPhoto[] };

    return (data.photos ?? []).flatMap((p) => {
      const src = p.src ?? {};
      const url = src.large ?? src.original;
      if (!url) return [];
      return [{
        url,
        urlWide: src.landscape ?? url,
        // A thumbnail for the grid: loading two dozen full-size photographs to
        // draw them at 120px wastes the viewer's bandwidth and their time.
        thumb: src.medium ?? src.small ?? url,
        alt: (p.alt ?? q).slice(0, 200),
        photographer: (p.photographer ?? "Pexels").slice(0, 120),
        photographerUrl: p.photographer_url ?? "https://www.pexels.com",
        source: "pexels" as const,
      }];
    });
  } catch {
    return [];
  }
}
