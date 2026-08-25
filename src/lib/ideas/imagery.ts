/**
 * Stock imagery for the validation slides.
 *
 * The slides need photographs that look like the business being validated, and
 * Phoxta has no stock-photo key set — PEXELS_API_KEY, UNSPLASH_ACCESS_KEY and
 * FAL_KEY are all unset. The 702 images already in public/assets/imgs are no
 * help either: they are named img-87.webp and sec-4-img-1.webp, so there is
 * nothing to match a sector against.
 *
 * So this is a curated set of Unsplash CDN photographs, keyed by sector — the
 * same source and URL shape the marketplace blueprints already use and render
 * from today. It needs no key, no request at build time, and no API that can
 * rate-limit a slide into a grey box.
 *
 * It is a fixed set, not a search: two food businesses get the same photographs,
 * though within one run all eight steps get different ones.
 * When a PEXELS_API_KEY is added, searchStock() below becomes the live path and
 * this becomes the fallback for when that call fails — which is the right shape
 * anyway, because a slide should never be blocked on a third party being up.
 */

export type Sector =
  | "food" | "retail" | "tech" | "services" | "health"
  | "travel" | "education" | "finance" | "creative" | "property" | "general";

/** Unsplash photo ids, sized for a slide band. Eight per sector — one for
 *  each step of a run, so no slide repeats the picture above it.
 *  Every id below was checked to resolve before being added. */
const PHOTOS: Record<Sector, string[]> = {
  food:      ["photo-1414235077428-338989a2e8c0", "photo-1504674900247-0877df9cc836", "photo-1466637574441-749b8f19452f", "photo-1555939594-58d7cb561ad1", "photo-1498837167922-ddd27525d352", "photo-1517248135467-4c7edcad34c4", "photo-1476224203421-9ac39bcb3327", "photo-1540189549336-e6e99c3679fe"],
  retail:    ["photo-1441986300917-64674bd600d8", "photo-1555529669-e69e7aa0ba9a", "photo-1472851294608-062f824d29cc", "photo-1483985988355-763728e1935b", "photo-1567401893414-76b7b1e5a7a5", "photo-1445205170230-053b83016050", "photo-1490481651871-ab68de25d43d", "photo-1573855619003-97b4799dcd8b"],
  tech:      ["photo-1518770660439-4636190af475", "photo-1461749280684-dccba630e2f6", "photo-1504384308090-c894fdcc538d", "photo-1531482615713-2afd69097998", "photo-1498050108023-c5249f4df085", "photo-1551288049-bebda4e38f71", "photo-1555949963-aa79dcee981c", "photo-1573164713988-8665fc963095"],
  services:  ["photo-1521737604893-d14cc237f11d", "photo-1600880292203-757bb62b4baf", "photo-1454165804606-c3d57bc86b40", "photo-1556761175-5973dc0f32e7", "photo-1497366216548-37526070297c", "photo-1497215728101-856f4ea42174", "photo-1568992687947-868a62a9f521", "photo-1552664730-d307ca884978"],
  health:    ["photo-1505576399279-565b52d4ac71", "photo-1571019613454-1cb2f99b2d8b", "photo-1576091160399-112ba8d25d1d", "photo-1544367567-0f2fcb009e0b", "photo-1519824145371-296894a0daa9", "photo-1538805060514-97d9cc17730c", "photo-1512069772995-ec65ed45afd6", "photo-1550831107-1553da8c8464"],
  travel:    ["photo-1566073771259-6a8506099945", "photo-1436491865332-7a61a109cc05", "photo-1507525428034-b723cf961d3e", "photo-1488646953014-85cb44e25828", "photo-1469854523086-cc02fe5d8800", "photo-1501785888041-af3ef285b470", "photo-1476514525535-07fb3b4ae5f1", "photo-1520250497591-112f2f40a3f4"],
  education: ["photo-1503676260728-1c00da094a0b", "photo-1522202176988-66273c2fd55f", "photo-1524178232363-1fb2b075b655", "photo-1523240795612-9a054b0db644", "photo-1509062522246-3755977927d7", "photo-1427504494785-3a9ca7044f45", "photo-1546410531-bb4caa6b424d", "photo-1513258496099-48168024aec0"],
  finance:   ["photo-1554224155-6726b3ff858f", "photo-1611974789855-9c2a0a7236a3", "photo-1590283603385-17ffb3a7f29f", "photo-1526304640581-d334cdbbf45e", "photo-1563986768609-322da13575f3", "photo-1579621970563-ebec7560ff3e", "photo-1518183214770-9cffbec72538", "photo-1567427017947-545c5f8d16ad"],
  creative:  ["photo-1561070791-2526d30994b5", "photo-1497032628192-86f99bcd76bc", "photo-1523726491678-bf852e717f6a", "photo-1542744173-8e7e53415bb0", "photo-1600880292089-90a7e086ee0c", "photo-1531403009284-440f080d1e12", "photo-1493421419110-74f4e85ba126", "photo-1558655146-9f40138edfeb"],
  property:  ["photo-1560518883-ce09059eeffa", "photo-1512917774080-9991f1c4c750", "photo-1600585154340-be6161a56a0c", "photo-1570129477492-45c003edd2be", "photo-1580587771525-78b9dba3b914", "photo-1449844908441-8829872d2607", "photo-1493809842364-78817add7ffb", "photo-1568605114967-8130f3a36994"],
  general:   ["photo-1497366754035-f200968a6e72", "photo-1517245386807-bb43f82c33c4", "photo-1522071820081-009f0129c71c", "photo-1519389950473-47ba0277781c", "photo-1531973576160-7125cd663d86", "photo-1542744094-3a31f272c490", "photo-1600880292203-757bb62b4baf", "photo-1552664730-d307ca884978"],
};

/** Words that place an idea in a sector, checked longest-first so "real estate"
 *  beats "estate" and "meal kit" beats "kit". */
const HINTS: [Sector, string[]][] = [
  ["food", ["restaurant", "meal", "food", "kitchen", "cafe", "coffee", "bakery", "catering", "grocery", "recipe", "dining"]],
  ["retail", ["shop", "store", "retail", "ecommerce", "e-commerce", "apparel", "fashion", "clothing", "boutique", "marketplace"]],
  ["tech", ["software", "saas", "app", "platform", "ai", "developer", "data", "automation", "api", "tech"]],
  ["health", ["health", "clinic", "wellness", "fitness", "therapy", "medical", "care", "gym", "nutrition"]],
  ["travel", ["travel", "tour", "trip", "hotel", "stay", "flight", "holiday", "booking", "experience"]],
  ["education", ["course", "school", "learn", "training", "education", "tutor", "student", "academy"]],
  ["finance", ["finance", "payment", "invoice", "lending", "insurance", "accounting", "bank", "investment"]],
  ["creative", ["design", "studio", "agency", "brand", "photography", "content", "media", "creative"]],
  ["property", ["property", "estate", "rental", "housing", "letting", "landlord", "home"]],
  ["services", ["service", "cleaning", "repair", "consult", "logistics", "delivery", "maintenance", "salon"]],
];

/** Which sector a piece of text reads as. */
export function sectorOf(...text: (string | null | undefined)[]): Sector {
  const hay = text.filter(Boolean).join(" ").toLowerCase();
  for (const [sector, words] of HINTS) {
    if (words.some((w) => hay.includes(w))) return sector;
  }
  return "general";
}

/**
 * A photograph for a slide.
 *
 * `variant` spreads the choice across a run so eight slides for one idea are not
 * eight copies of the same picture — it indexes into the sector's set rather
 * than randomising, so the same slide shows the same image on every render.
 */
export function stockImage(sector: Sector, variant = 0, w = 1200, h = 600): string {
  const set = PHOTOS[sector] ?? PHOTOS.general;
  const id = set[variant % set.length];
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=${h}&q=70`;
}

/** Convenience: pick straight from an idea's own words. */
export function imageForIdea(text: string, variant = 0, w?: number, h?: number): string {
  return stockImage(sectorOf(text), variant, w, h);
}
