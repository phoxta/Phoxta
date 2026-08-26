/**
 * Pictures for the validation slides.
 *
 * WHAT CHANGED AND WHY
 *
 * This used to pick one of eleven broad sectors from the idea's own words, so a
 * meal-kit subscription and a Michelin restaurant got the same eight photographs
 * and every stage of a run was illustrated by the sector rather than by what the
 * stage was actually about. That is the "random image" problem: the picture was
 * never wrong, but it was never about anything either.
 *
 * Now each step names its own subject. `idea-run` asks every prompt for an
 * `imageQuery` — a few words describing something photographable and specific to
 * that stage of THIS business ("dark store order picking", "family eating dinner
 * at home") — and that query drives the picture two ways:
 *
 *   1. LIVE SEARCH, when a stock key is configured. VITE_UNSPLASH_ACCESS_KEY or
 *      VITE_PEXELS_API_KEY turns on a real search against the query, which is
 *      the only way to get a genuinely exact photograph. Neither is set on this
 *      project today, so this path is dormant — see the note at the bottom.
 *
 *   2. SUBJECT MATCH otherwise. The query is matched against ~35 concrete
 *      subjects rather than 11 sectors, so a stage about last-mile delivery gets
 *      a delivery photograph even though the business is a food business. Not
 *      exact, but about the right thing.
 *
 * Every id below was checked by LOOKING AT IT, not by checking that it
 * resolves. A 200 says the photograph exists, not that it shows what the key
 * claims: the first pass at this list put a QR-code screen, a blood donation
 * and three Mario figurines under "delivery", and all three loaded perfectly.
 * The map is rendered as a contact sheet and eyeballed whenever it changes.
 */

/* ── Subjects ──────────────────────────────────────────────────────────────
   Concrete nouns, not industries. A subject is something you could photograph;
   "retail" is not, which is why the old sector map produced such vague results. */

const PHOTOS: Record<string, string[]> = {
  kitchen:    ["photo-1556910103-1c02745aae4d", "photo-1600565193348-f74bd3c7ccdf", "photo-1504674900247-0877df9cc836"],
  dining:     ["photo-1414235077428-338989a2e8c0", "photo-1517248135467-4c7edcad34c4", "photo-1555939594-58d7cb561ad1"],
  produce:    ["photo-1466637574441-749b8f19452f", "photo-1498837167922-ddd27525d352"],
  bakery:     ["photo-1555507036-ab1f4038808a", "photo-1486427944299-d1955d23e34d", "photo-1517433670267-08bbd4be890f"],
  coffee:     ["photo-1495474472287-4d71bcdd2085", "photo-1501339847302-ac426a4a7cbb", "photo-1442512595331-e89e73853f31"],
  delivery:   ["photo-1601584115197-04ecc0da31d7", "photo-1616432043562-3671ea2e5242", "photo-1580674285054-bed31e145f59"],
  warehouse:  ["photo-1587293852726-70cdb56c2866", "photo-1553413077-190dd305871c", "photo-1519003722824-194d4455a60c"],
  packaging:  ["photo-1595246140625-573b715d11dc", "photo-1580674285054-bed31e145f59"],
  shop:       ["photo-1441986300917-64674bd600d8", "photo-1555529669-e69e7aa0ba9a", "photo-1483985988355-763728e1935b"],
  fashion:    ["photo-1490481651871-ab68de25d43d", "photo-1567401893414-76b7b1e5a7a5", "photo-1445205170230-053b83016050"],
  office:     ["photo-1497366811353-6870744d04b2", "photo-1524758631624-e2822e304c36", "photo-1497366754035-f200968a6e72"],
  meeting:    ["photo-1600880292089-90a7e086ee0c", "photo-1517048676732-d65bc937f952", "photo-1600880292203-757bb62b4baf"],
  laptop:     ["photo-1498050108023-c5249f4df085", "photo-1461749280684-dccba630e2f6"],
  mobile:     ["photo-1512941937669-90a1b58e7e9c", "photo-1556656793-08538906a9f8"],
  analytics:  ["photo-1460925895917-afdab827c52f", "photo-1504868584819-f8e8b4b6d7e3"],
  money:      ["photo-1554224155-6726b3ff858f", "photo-1526304640581-d334cdbbf45e", "photo-1579621970563-ebec7560ff3e"],
  support:    ["photo-1521737711867-e3b97375f902", "photo-1552581234-26160f608093"],
  server:     ["photo-1518770660439-4636190af475", "photo-1573164713988-8665fc963095"],
  clinic:     ["photo-1666214280557-f1b5022eb634", "photo-1631217868264-e5b90bb7e133", "photo-1519494026892-80bbd2d6fd0d"],
  fitness:    ["photo-1517836357463-d25dfeac3438", "photo-1534438327276-14e5300c3a48", "photo-1540497077202-7c8a3999166f"],
  salon:      ["photo-1560066984-138dadb4c035", "photo-1521590832167-7bcbfaa6381f"],
  hotel:      ["photo-1566073771259-6a8506099945", "photo-1520250497591-112f2f40a3f4"],
  travel:     ["photo-1488646953014-85cb44e25828", "photo-1469854523086-cc02fe5d8800", "photo-1436491865332-7a61a109cc05"],
  vehicle:    ["photo-1486262715619-67b85e0b08d3"],
  property:   ["photo-1560518883-ce09059eeffa", "photo-1512917774080-9991f1c4c750"],
  interior:   ["photo-1586023492125-27b2c045efd7", "photo-1600585154340-be6161a56a0c"],
  classroom:  ["photo-1523240795612-9a054b0db644", "photo-1503676260728-1c00da094a0b"],
  books:      ["photo-1481627834876-b7833e8f5570", "photo-1509062522246-3755977927d7"],
  workshop:   ["photo-1504328345606-18bbc8c9d7d1"],
  farm:       ["photo-1500595046743-cd271d694d30", "photo-1466692476868-aef1dfb1e735"],
  family:     ["photo-1476234251651-f353703a034d"],
  pet:        ["photo-1450778869180-41d0601e046e"],
  studio:     ["photo-1502920917128-1aa500764cbd", "photo-1561070791-2526d30994b5", "photo-1497032628192-86f99bcd76bc"],
  event:      ["photo-1540575467063-178a50c2df87"],
  cleaning:   ["photo-1581578731548-c64695cc6952"],
  city:       ["photo-1449824913935-59a10b8d2000"],
  general:    ["photo-1522071820081-009f0129c71c", "photo-1517245386807-bb43f82c33c4", "photo-1531973576160-7125cd663d86"],
};

/**
 * Words that point at a subject.
 *
 * Ordered, and the first hit wins, so the specific entries sit above the general
 * ones — "dark store" has to be read as a warehouse before "store" turns it into
 * a shopfront.
 */
const HINTS: [string, string[]][] = [
  ["warehouse", ["dark store", "warehouse", "fulfilment", "fulfillment", "picking", "stock room", "depot", "inventory"]],
  ["delivery", ["last mile", "last-mile", "delivery", "courier", "driver", "van", "dispatch", "shipping", "logistics", "3pl"]],
  ["packaging", ["packaging", "packing", "parcel", "unboxing", "label"]],
  ["family", ["family", "parent", "children", "kids", "household", "home life"]],
  ["kitchen", ["kitchen", "chef", "cooking", "meal kit", "catering", "recipe", "cook"]],
  ["bakery", ["bakery", "bread", "pastry", "cake", "baker"]],
  ["coffee", ["coffee", "barista", "espresso", "cafe", "café"]],
  ["dining", ["restaurant", "dining", "diner", "menu", "eating", "dinner", "waiter", "food"]],
  ["produce", ["produce", "grocery", "groceries", "vegetable", "ingredient", "farmers market", "market stall"]],
  ["farm", ["farm", "agriculture", "crop", "harvest", "field", "garden", "grower"]],
  ["fashion", ["clothing", "apparel", "fashion", "garment", "boutique", "wardrobe", "outfit", "textile"]],
  ["shop", ["shopfront", "storefront", "shop", "store", "retail", "shelf", "checkout", "till", "high street"]],
  ["support", ["support", "helpdesk", "call centre", "call center", "customer service", "headset", "enquiry"]],
  ["analytics", ["dashboard", "analytics", "metrics", "chart", "data", "forecast", "projection", "spreadsheet"]],
  ["money", ["revenue", "pricing", "price", "payment", "invoice", "cash", "funding", "investment", "finance", "margin", "unit economics", "cost"]],
  ["mobile", ["mobile", "phone", "smartphone", "app screen", "booking app", "notification"]],
  ["laptop", ["laptop", "coding", "developer", "software", "screen", "typing", "website"]],
  ["server", ["server", "infrastructure", "cloud", "network", "data centre", "data center", "hardware"]],
  ["meeting", ["meeting", "team", "colleagues", "interview", "handshake", "pitch", "boardroom", "founders", "workshop session"]],
  ["office", ["office", "desk", "workspace", "coworking", "admin", "paperwork"]],
  ["clinic", ["clinic", "medical", "doctor", "nurse", "patient", "therapy", "health", "dental", "pharmacy"]],
  ["fitness", ["gym", "fitness", "workout", "training session", "exercise", "yoga", "pilates", "athlete"]],
  ["salon", ["salon", "barber", "hair", "beauty", "nails", "spa", "grooming"]],
  ["hotel", ["hotel", "guest room", "stay", "reception", "hospitality", "lobby"]],
  ["travel", ["travel", "tour", "trip", "flight", "airport", "holiday", "luggage", "destination", "experience"]],
  ["vehicle", ["car", "vehicle", "fleet", "rental", "garage", "mechanic", "driving", "motor"]],
  ["property", ["property", "estate", "house", "letting", "landlord", "tenant", "building"]],
  ["interior", ["interior", "furniture", "living room", "homeware", "decor", "renovation"]],
  ["classroom", ["classroom", "school", "student", "teacher", "lecture", "tutor", "course", "learning"]],
  ["books", ["book", "reading", "library", "study", "curriculum", "notes"]],
  ["workshop", ["workshop", "tools", "repair", "maker", "craft", "manufacturing", "construction", "trade"]],
  ["cleaning", ["cleaning", "cleaner", "housekeeping", "laundry", "maintenance"]],
  ["pet", ["pet", "dog", "cat", "animal", "veterinary"]],
  ["studio", ["studio", "photography", "camera", "design", "creative", "content", "filming", "brand", "agency"]],
  ["event", ["event", "conference", "audience", "stage", "festival", "wedding", "party"]],
  ["city", ["city", "street", "urban", "neighbourhood", "neighborhood", "london", "commute"]],
];

/** Which subject a piece of text reads as. */
export function subjectOf(...text: (string | null | undefined)[]): string {
  const hay = text.filter(Boolean).join(" ").toLowerCase();
  if (!hay.trim()) return "general";
  for (const [subject, words] of HINTS) {
    if (words.some((w) => hay.includes(w))) return subject;
  }
  return "general";
}

/**
 * A photograph for a slide.
 *
 * `variant` spreads the choice within a subject so two stages that land on the
 * same one are not the same picture. It indexes rather than randomises, so a
 * slide shows the same image on every render.
 */
export function stockImage(subject: string, variant = 0, w = 1200, h = 600): string {
  const set = PHOTOS[subject] ?? PHOTOS.general;
  const id = set[Math.abs(variant) % set.length];
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=${h}&q=70`;
}

/**
 * The picture for one stage.
 *
 * `query` is what the model said this stage is about; `fallbackText` is the
 * idea's own words, used when a stage predates the imageQuery field or the model
 * left it out. The query is tried alone first, so a specific stage subject is
 * not drowned out by the idea's sector.
 */
export function imageForStage(
  query: string | null | undefined,
  fallbackText: string,
  variant = 0,
  w?: number,
  h?: number,
): string {
  const fromQuery = subjectOf(query);
  const subject = fromQuery !== "general" ? fromQuery : subjectOf(fallbackText);
  return stockImage(subject, variant, w, h);
}

/* ── Live search ───────────────────────────────────────────────────────────

   Neither VITE_UNSPLASH_ACCESS_KEY nor VITE_PEXELS_API_KEY is set on this
   project, and both APIs reject unauthenticated requests outright — I checked:
   401 from each. The keyless alternatives are worse than the curated set rather
   than better. source.unsplash.com, which used to serve exactly this need, has
   been retired and answers 503. Openverse and Wikimedia Commons are open and
   free, but they index amateur and institutional photography: a Commons search
   for "car rental office" returns ice hockey arenas, and one for "family dinner"
   returns a photograph titled "This is just the leftovers".

   So EXACT per-idea photographs need a key, and this is the seam where one goes.
   Add a free Unsplash demo key as VITE_UNSPLASH_ACCESS_KEY and searchStock()
   starts resolving the model's own imageQuery against real search results; the
   curated set stays as the fallback for when the call fails, which is the right
   shape anyway — a slide should never be blocked on a third party being up. */

// Read defensively. Vite substitutes import.meta.env at build time, but this
// module is also pulled in by anything that renders a slide outside a Vite
// build — the prerender pass, a test harness — where it is simply absent.
const ENV = ((import.meta as unknown as { env?: Record<string, string | undefined> }).env) ?? {};
const UNSPLASH_KEY = ENV.VITE_UNSPLASH_ACCESS_KEY;
const PEXELS_KEY = ENV.VITE_PEXELS_API_KEY;

export const hasStockKey = Boolean(UNSPLASH_KEY || PEXELS_KEY);

/** Resolved queries, so re-rendering a slide does not re-spend the rate limit. */
const cache = new Map<string, string>();

/**
 * Search for a photograph of `query`.
 *
 * Returns null rather than throwing, and rather than a placeholder: the caller
 * already has a curated image on screen, and swapping a real photograph for a
 * grey box because a third party rate-limited us is a downgrade, not a fallback.
 */
export async function searchStock(query: string, w = 1200, h = 600): Promise<string | null> {
  const key = `${query}|${w}x${h}`;
  const hit = cache.get(key);
  if (hit) return hit;
  if (!hasStockKey || !query.trim()) return null;

  try {
    if (UNSPLASH_KEY) {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?per_page=1&orientation=landscape&query=${encodeURIComponent(query)}`,
        { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } },
      );
      if (!res.ok) return null;
      const data = await res.json();
      const raw = data?.results?.[0]?.urls?.raw as string | undefined;
      if (!raw) return null;
      const url = `${raw}&auto=format&fit=crop&w=${w}&h=${h}&q=70`;
      cache.set(key, url);
      return url;
    }

    const res = await fetch(
      `https://api.pexels.com/v1/search?per_page=1&orientation=landscape&query=${encodeURIComponent(query)}`,
      { headers: { Authorization: PEXELS_KEY as string } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const src = data?.photos?.[0]?.src?.landscape as string | undefined;
    if (!src) return null;
    cache.set(key, src);
    return src;
  } catch {
    return null;
  }
}
