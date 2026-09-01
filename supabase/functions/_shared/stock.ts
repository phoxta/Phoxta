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
 * "It found nothing" and "it could not look" are different answers.
 *
 * searchStock's null collapsed them, which was the right trade for a
 * validation slide with a curated fallback and the wrong one for the graphics
 * studio: a rate-limited afternoon at Pexels read as "no photograph of a
 * bakery exists", and the person rewrote their search instead of waiting.
 * `unavailable` carries the reason the service could not be asked; when it is
 * absent, an empty result genuinely means nothing matched.
 */
export type StockLookup = { photo: StockImage | null; unavailable?: string };
export type StockPage = { photos: StockImage[]; unavailable?: string };

/**
 * The per-tenant bound on a SHARED quota.
 *
 * Pexels allows 200 requests an hour for the whole platform key, so one
 * business regenerating a thirty-post plan a few times could spend everyone
 * else's afternoon. The bucket is per isolate — a cold start forgets it and
 * parallel isolates each carry their own — so it is a brake, not an exact
 * meter; the exact meter would be a table, and a photo search does not earn a
 * database round trip. Callers that pass no org (the idea/dossier slides,
 * which run for anonymous visitors) are bounded by the shared 200/hr alone.
 */
const ORG_HOURLY = Math.max(1, Number(Deno.env.get("PEXELS_ORG_HOURLY") ?? "30"));
const buckets = new Map<string, { hour: number; used: number }>();

function underOrgBudget(orgId: string | undefined): boolean {
  if (!orgId) return true;
  const hour = Math.floor(Date.now() / 3_600_000);
  const b = buckets.get(orgId);
  if (!b || b.hour !== hour) {
    buckets.set(orgId, { hour, used: 1 });
    return true;
  }
  if (b.used >= ORG_HOURLY) return false;
  b.used++;
  return true;
}

/** One fetch against Pexels, with the failure kept distinct from the miss. */
async function pexels(
  params: string,
  orgId?: string,
): Promise<{ ok: true; photos: PexelsPhoto[] } | { ok: false; reason: string }> {
  const key = Deno.env.get("PEXELS_API_KEY");
  if (!key) return { ok: false, reason: "stock photography is not configured (PEXELS_API_KEY)" };
  if (!underOrgBudget(orgId)) {
    return { ok: false, reason: "this business has used this hour's stock-photo searches — try again shortly" };
  }
  try {
    const res = await fetch(`https://api.pexels.com/v1/search?${params}`, { headers: { Authorization: key } });
    if (!res.ok) return { ok: false, reason: `Pexels answered HTTP ${res.status}` };
    const data = await res.json() as { photos?: PexelsPhoto[] };
    return { ok: true, photos: data.photos ?? [] };
  } catch (e) {
    return { ok: false, reason: `Pexels could not be reached: ${(e as Error)?.message ?? e}` };
  }
}

/**
 * Find a photograph for `query`, and say WHY when it could not look.
 *
 * The distinct-failure sibling of searchStock below, for callers with a person
 * on the other end. Pass `orgId` wherever there is a tenant, so the hourly
 * bucket above can do its work.
 */
export async function findStock(query: string, opts: { orgId?: string } = {}): Promise<StockLookup> {
  const q = query.trim();
  if (!q) return { photo: null };

  const res = await pexels(
    `per_page=5&orientation=landscape&size=medium&query=${encodeURIComponent(q)}`,
    opts.orgId,
  );
  if (!res.ok) return { photo: null, unavailable: res.reason };

  const photos = res.photos;
  if (photos.length === 0) return { photo: null };

  // Not photos[0]. Pexels orders by relevance, and the top hit for a business
  // query is very often the most generic stock frame in the set — the one
  // every other deck already uses. The second is nearly as relevant and much
  // less worn. Deterministic, so re-resolving the same query is idempotent.
  const pick = photos[Math.min(1, photos.length - 1)];
  const src = pick.src ?? {};
  const url = src.large ?? src.landscape ?? src.original;
  if (!url) return { photo: null };

  return {
    photo: {
      url,
      urlWide: src.landscape ?? url,
      alt: (pick.alt ?? q).slice(0, 200),
      photographer: (pick.photographer ?? "Pexels").slice(0, 120),
      photographerUrl: pick.photographer_url ?? "https://www.pexels.com",
      source: "pexels",
    },
  };
}

/**
 * A page of results, for a picker.
 *
 * findStock above answers "give me the one good photograph for this", which
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
export async function findStockMany(
  query: string,
  perPage = 24,
  opts: { orgId?: string } = {},
): Promise<StockPage> {
  const q = query.trim();
  if (!q) return { photos: [] };

  const res = await pexels(
    `per_page=${Math.min(80, Math.max(1, perPage))}&query=${encodeURIComponent(q)}`,
    opts.orgId,
  );
  if (!res.ok) return { photos: [], unavailable: res.reason };

  return {
    photos: res.photos.flatMap((p) => {
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
    }),
  };
}

/**
 * The original shapes, kept for the slide pipeline (idea-run, dossier-run,
 * idea-image, dossier-image). Those callers have a curated fallback on the
 * slide and genuinely do not care WHY there is no photograph — losing a whole
 * validation step because a photo service was briefly unavailable would be an
 * absurd trade. The graphics studio's callers use findStock/findStockMany and
 * say which failure it was.
 */
export async function searchStock(query: string): Promise<StockImage | null> {
  return (await findStock(query)).photo;
}

export async function searchStockMany(query: string, perPage = 24): Promise<StockImage[]> {
  return (await findStockMany(query, perPage)).photos;
}
