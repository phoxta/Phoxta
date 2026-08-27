// Phoxta — the unified agent's tool surface. Read/RAG tools (from tools.ts)
// plus guardrailed WRITE tools that let the one agent actually operate the
// business: schedule, capture/qualify leads, open tickets, route by location,
// schedule callbacks, escalate. All hard-scoped to one org; actions are
// recorded on the shared ctx so the caller can show what the agent did.
//
// HONESTY UPGRADE: booking tools are now VERTICAL-AWARE. Rental/stay/experience
// businesses get real per-day availability + reservations (RPCs from 0028),
// restaurants get table-request tools (0050), and appointment businesses get
// slots generated from the owner's actual business hours + service durations —
// never the old hardcoded Mon–Fri 9/11/13/15 UTC fiction. Every tool reports
// what it truly knows; when config is missing it says so instead of inventing.
import type { SupabaseClient } from "./supabaseAdmin.ts";
import type { Tool } from "./anthropic.ts";
import { READ_TOOLS, MARKETPLACE_TOOLS, toolRunner } from "./tools.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

/** A call-to-action on a card ("View demo", "Buy on Phoxta"). The chat widget
 *  renders these as buttons and drops anything that isn't http(s). */
export type CardLink = { label: string; url: string };

/** A product the agent referenced this turn, returned to the caller so a chat
 *  surface can render a real card — image, price, link — instead of the model
 *  describing a photo it cannot show. */
export type ProductCard = {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  currency: string;
  image_url: string | null;
  /** Optional strapline shown under the name; the widget falls back to description. */
  tagline?: string | null;
  /** Optional CTA links rendered as buttons that open in a new tab. */
  links?: CardLink[];
};

/** Inline media a tool attaches to the reply (rendered inside the chat bubble
 *  on web; text-only channels ignore it, exactly like cards). */
export type MediaItem = { type: "image"; url: string; alt?: string };

export type AgentCtx = {
  conversationId: string | null;
  /** `handle`/`handleKind` carry the identity for channels that have neither an
   *  email nor a phone — a social DM's platform-scoped sender id. They feed
   *  app_resolve_contact so those senders link to the same person as their
   *  calls and emails rather than becoming orphan contacts. */
  customer: {
    name?: string;
    phone?: string;
    email?: string;
    zip?: string;
    handle?: string;
    handleKind?: "instagram" | "messenger" | "telegram" | "rcs" | "apple" | "web";
  };
  contactId: string | null;
  locationId: string | null;
  /** Channel the customer reached us on (web/sms/whatsapp/voice/email…). */
  channel?: string;
  actions: string[];
  /** Rich results produced this turn. Text channels (SMS, voice) ignore these;
   *  web chat renders them. */
  cards?: ProductCard[];
  /** Inline media (images) attached this turn — same contract as cards:
   *  additive, absent by default, ignored by text-only channels. */
  media?: MediaItem[];
  /**
   * What find_picture last showed the model, so attach_picture can only ever
   * name something that actually exists.
   *
   * Held for the length of one turn and nowhere else. The alternative — letting
   * attach_picture take a URL — would let a model that had read a customer's own
   * message put an arbitrary URL on a business's outbound message, which is a
   * business unknowingly forwarding a stranger's link to its own customers.
   */
  pictureShortlist?: { ref: string; name: string; url: string; kind: "photo" | "design" }[];
  /** Why the agent chose the picture it attached — recorded on the message and
   *  in the audit line, because an unexplained attachment is not a choice. */
  pictureReason?: string;
};

// ---------------------------------------------------------------------------
// Booking mode: which booking model this business actually runs on.
// ---------------------------------------------------------------------------
export type BookingMode = "reservations" | "table" | "appointments";

const RESERVATION_VERTICAL =
  /\b(rental|rentals|car|cars|vehicle|vehicles|fleet|stay|stays|hotel|hotels|apartment|apartments|experience|experiences|tour|tours|travel)\b/;
const TABLE_VERTICAL = /\b(restaurant|restaurants|dining|bistro|cafe|café)\b/;

export function resolveBookingMode(vertical: string | null | undefined): BookingMode {
  const v = (vertical || "").toLowerCase();
  if (RESERVATION_VERTICAL.test(v)) return "reservations";
  if (TABLE_VERTICAL.test(v)) return "table";
  return "appointments";
}

// ---------------------------------------------------------------------------
// Tool declarations (per booking mode + shared write tools)
// ---------------------------------------------------------------------------
const APPOINTMENT_TOOLS: Tool[] = [
  {
    name: "check_availability",
    description:
      "Check real open appointment slots (from the business's configured hours and existing bookings) before offering a time. Optionally filter by service.",
    input_schema: { type: "object", properties: { service: { type: "string" } } },
  },
  {
    name: "book_appointment",
    description: "Book an appointment once the customer confirms a specific time (ISO 8601). Refuses times that conflict with another booking.",
    input_schema: {
      type: "object",
      properties: { service: { type: "string" }, start_at: { type: "string" }, customer_name: { type: "string" }, customer_email: { type: "string" } },
      required: ["start_at"],
    },
  },
  {
    name: "reschedule_appointment",
    description: "Move the customer's most recent appointment to a new time (ISO 8601).",
    input_schema: { type: "object", properties: { start_at: { type: "string" } }, required: ["start_at"] },
  },
];

const RESERVATION_TOOLS: Tool[] = [
  {
    name: "check_availability",
    description:
      "Check REAL per-day availability for a bookable resource (car, room, experience) over a date range before offering dates. Omit product_name to list what can be booked. Dates are YYYY-MM-DD; end_date is the checkout/return day.",
    input_schema: {
      type: "object",
      properties: { product_name: { type: "string" }, start_date: { type: "string" }, end_date: { type: "string" } },
    },
  },
  {
    name: "create_reservation",
    description:
      "Reserve the resource for the customer once they confirm the item and dates (YYYY-MM-DD; end_date = return/checkout day). Requires the customer's name and email. The request is verified against real availability.",
    input_schema: {
      type: "object",
      properties: {
        product_name: { type: "string" },
        start_date: { type: "string" },
        end_date: { type: "string" },
        units: { type: "number" },
        customer_name: { type: "string" },
        customer_email: { type: "string" },
      },
      required: ["product_name", "start_date", "end_date"],
    },
  },
];

const TABLE_TOOLS: Tool[] = [
  {
    name: "check_availability",
    description:
      "Explain how table booking works here: the restaurant takes requests (date, time, party size) and confirms each one personally — there is NO live table map, so never promise a specific table is free.",
    input_schema: { type: "object", properties: { date: { type: "string", description: "YYYY-MM-DD" } } },
  },
  {
    name: "book_table",
    description: "Submit a table reservation REQUEST (date YYYY-MM-DD, time, party size). Needs the customer's name and an email or phone. The restaurant confirms it — present it as a request, not a confirmed table.",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string" },
        time: { type: "string" },
        party: { type: "number" },
        customer_name: { type: "string" },
        customer_email: { type: "string" },
        customer_phone: { type: "string" },
      },
      required: ["date"],
    },
  },
];

/**
 * Customer self-service lookups.
 *
 * These are the only way the public agent can reach an existing order or
 * booking, and they are deliberately narrow: the caller must supply BOTH a
 * reference AND the email on the record. Knowing only an email returns nothing,
 * and knowing only a reference returns nothing — so guessing one does not leak
 * the other, and nothing can be enumerated.
 */
const LOOKUP_TOOLS: Tool[] = [
  {
    name: "lookup_order",
    description:
      "Look up ONE order for the customer you are talking to — status, whether it is paid, whether it has shipped, and tracking. " +
      "Requires BOTH the order reference and the email address on the order; ask for whichever you are missing. " +
      "Never claim you cannot check an order without trying this first.",
    input_schema: {
      type: "object",
      properties: {
        reference: { type: "string", description: "Order reference or the short id the customer was given." },
        email: { type: "string", description: "The email address on the order." },
      },
      required: ["reference", "email"],
    },
  },
  {
    name: "lookup_booking",
    description:
      "Look up ONE existing booking or reservation — when it is, its status, and what it is for. " +
      "Requires BOTH a reference (or the date) and the email on the booking. Ask for whichever is missing.",
    input_schema: {
      type: "object",
      properties: {
        reference: { type: "string", description: "Booking reference, short id, or the date (YYYY-MM-DD)." },
        email: { type: "string", description: "The email address on the booking." },
      },
      required: ["reference", "email"],
    },
  },
];

const COMMON_WRITE_TOOLS: Tool[] = [
  {
    name: "capture_lead",
    description: "Save the customer as a CRM contact/lead. Call this whenever you learn their name and a phone or email.",
    input_schema: { type: "object", properties: { name: { type: "string" }, phone: { type: "string" }, email: { type: "string" }, notes: { type: "string" } } },
  },
  {
    name: "qualify_lead",
    description: "Record a lead-qualification result for this conversation (filters spam, scores intent).",
    input_schema: {
      type: "object",
      properties: { score: { type: "number", description: "0-100 buying intent" }, qualified: { type: "boolean" }, reason: { type: "string" } },
      required: ["score", "qualified"],
    },
  },
  {
    name: "create_ticket",
    description: "Open a support ticket for an issue or complaint that needs follow-up.",
    input_schema: { type: "object", properties: { subject: { type: "string" }, message: { type: "string" } }, required: ["subject"] },
  },
  {
    name: "recommend_products",
    description: "Get the catalog to make an upsell or cross-sell recommendation.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "route_location",
    description: "Route the caller to the right branch/location by ZIP code and service type (multi-location call center).",
    input_schema: { type: "object", properties: { zip: { type: "string" }, service: { type: "string" } } },
  },
  {
    name: "schedule_callback",
    description: "Queue a callback to the customer (e.g. instant callback or after-hours follow-up).",
    input_schema: { type: "object", properties: { when: { type: "string" }, channel: { type: "string", enum: ["call", "sms", "email"] }, reason: { type: "string" } } },
  },
  {
    name: "escalate_to_human",
    description: "Hand the conversation to a human teammate for complaints, refunds, or anything you can't resolve.",
    input_schema: { type: "object", properties: { reason: { type: "string" } }, required: ["reason"] },
  },
];

/**
 * SHOWING SOMEBODY A PICTURE.
 *
 * The business already owns pictures — photographs it uploaded, images the model
 * drew for it, and the designs it made in the graphics studio, each of which now
 * keeps a rendered PNG in the same public bucket. Until now none of them could
 * reach a customer: the agent could describe a menu, a price list or a part, and
 * that was all.
 *
 * TWO tools, not one, and that is the point. An agent that attaches a picture
 * from a fuzzy search is an agent that occasionally attaches the wrong picture,
 * and a wrong picture from a business is worse than no picture at all — it is
 * the business appearing to answer a question it has not answered. So the model
 * must SEE the library first and then name exactly one thing it saw, with a
 * reason. Both halves are recorded: the reason goes in the audit line, and the
 * picture itself onto the message, so an owner can look at the thread and see
 * precisely what their customer received.
 */
const PICTURE_TOOLS: Tool[] = [
  {
    name: "find_picture",
    description:
      "Search this business's OWN picture library — photographs it uploaded, images it generated, and the designs it made (menus, price lists, posters). " +
      "Use it when a picture would answer the question better than words: 'what does it look like', 'send me the menu', 'do you have a photo of it'. " +
      "Returns the pictures it holds with a reference for each. It sends nothing — call attach_picture with one of these references to actually show it.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string", description: "What the picture should be of, in a few words." } },
      required: ["query"],
    },
  },
  {
    name: "attach_picture",
    description:
      "Show the customer ONE picture from the library, alongside your reply. The reference must be one find_picture just returned — never invent one. " +
      "Only attach a picture that genuinely answers what was asked; a decorative or roughly-related picture is worse than none. One picture per reply.",
    input_schema: {
      type: "object",
      properties: {
        ref: { type: "string", description: "The reference from find_picture." },
        reason: { type: "string", description: "Why this picture answers this customer's question." },
      },
      required: ["ref", "reason"],
    },
  },
];

const BOOKING_TOOL_NAMES = new Set(
  [...APPOINTMENT_TOOLS, ...RESERVATION_TOOLS, ...TABLE_TOOLS].map((t) => t.name),
);
const LEAD_TOOL_NAMES = new Set(["capture_lead", "qualify_lead"]);

const isWrite = new Set([...BOOKING_TOOL_NAMES, ...COMMON_WRITE_TOOLS.map((t) => t.name)]);

/** The tool surface for one business: read tools + the booking tools that match
 *  its vertical, filtered by the owner's enabled capabilities (a missing key
 *  defaults to enabled for back-compat). */
export function buildAgentTools(mode: BookingMode, capabilities?: Record<string, boolean> | null): Tool[] {
  const on = (key: string) => capabilities?.[key] !== false;
  const booking = mode === "reservations" ? RESERVATION_TOOLS : mode === "table" ? TABLE_TOOLS : APPOINTMENT_TOOLS;
  // marketplace defaults OFF — `on()` treats an absent key as true, so this one
  // is checked explicitly. Only the Phoxta platform org sells blueprints.
  const marketplace = capabilities?.marketplace === true;
  let tools: Tool[] = [
    ...READ_TOOLS,
    ...LOOKUP_TOOLS,
    ...(marketplace ? MARKETPLACE_TOOLS : []),
    ...(on("bookings") ? booking : []),
    ...COMMON_WRITE_TOOLS,
    // `pictures` follows the same absent-means-on rule as the rest, so a
    // business that has never opened its capability list still gets them — the
    // library being empty is answered by find_picture in one cheap turn.
    ...(on("pictures") ? PICTURE_TOOLS : []),
  ];
  if (!on("leads")) tools = tools.filter((t) => !LEAD_TOOL_NAMES.has(t.name));
  if (!on("tickets")) tools = tools.filter((t) => t.name !== "create_ticket");
  return tools;
}

/** Does this business's agent have the picture tools at all? The system prompt
 *  asks, so it can tell the model what showing a picture costs on THIS channel
 *  rather than describing a capability that is switched off. */
export const picturesEnabled = (capabilities?: Record<string, boolean> | null): boolean =>
  capabilities?.pictures !== false;

// ---------------------------------------------------------------------------
// THE BUSINESS'S OWN PICTURE LIBRARY, as the agent sees it.
//
// Two sources, one list:
//
//   PHOTOGRAPHS  objects in the public `design-assets` bucket, under the
//                organisation's own prefix. Uploads and generated images alike —
//                design-assets/index.ts stores both there with the label written
//                into the object name, which is why the name can be read back.
//
//   DESIGNS      rows in `designs` that carry a rendered PNG. A design is stored
//                as a JSON document and painted in the browser, so until the
//                studio started publishing a PNG on save there was nothing on
//                the server to send. png_url is that file, in the same bucket.
//
// Both are public https URLs on the storage origin, which is exactly what Twilio
// needs: it fetches the media itself rather than accepting bytes.
// ---------------------------------------------------------------------------

const BUCKET = "design-assets";

/** design-assets writes `<kind>__<millis+token>__<slug>.<ext>`. The label is the
 *  slug; anything that does not match the scheme is reported by its file name
 *  rather than dropped, exactly as the library's own reader does. */
function assetLabel(file: string): string {
  const parts = file.split("__");
  const raw = parts.length >= 3 && (parts[0] === "up" || parts[0] === "gen") ? parts.slice(2).join("__") : file;
  return raw.replace(/\.[a-z0-9]{2,5}$/i, "").replace(/[-_]+/g, " ").trim() || file;
}

/** Only the two types WhatsApp will carry are worth offering. A WebP in the
 *  library is a real picture, but attaching one fails the whole message, so the
 *  agent is never shown one to choose. */
const SENDABLE_EXT = /\.(png|jpe?g)$/i;

function pictureScore(name: string, query: string): number {
  const words = (s: string) => new Set((s.toLowerCase().match(/[a-z][a-z0-9'-]{2,}/g) ?? []).map((w) => w.replace(/(ies|es|s)$/, "")));
  const q = words(query);
  if (q.size === 0) return 0;
  const n = words(name);
  let hits = 0;
  for (const w of q) if (n.has(w)) hits++;
  // A substring match catches "menu" inside "autumn-menu-2026" where the word
  // split already handles it, and "a4 pricelist" against "price list".
  const flat = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const w of q) if (!n.has(w) && flat.includes(w.replace(/[^a-z0-9]/g, ""))) hits += 0.5;
  return hits;
}

/** How many the model is shown. Enough to choose between, few enough that the
 *  choice stays a decision rather than a scan. */
const PICTURE_SHORTLIST = 6;

async function searchPictures(
  admin: SupabaseClient,
  orgId: string,
  query: string,
): Promise<{ ref: string; name: string; url: string; kind: "photo" | "design" }[]> {
  const out: { name: string; url: string; kind: "photo" | "design" }[] = [];
  const seen = new Set<string>();

  // Designs first: a design is something the business MADE to be shown — a menu,
  // a price list, a poster — so it is nearly always the better answer.
  try {
    // select("*") because png_url arrives with migration 0120 and edge functions
    // deploy independently of migrations; naming a column that is not there yet
    // would turn "show me the menu" into an error instead of a polite miss.
    const { data, error } = await admin
      .from("designs")
      .select("*")
      .eq("organization_id", orgId)
      .neq("status", "archived")
      .order("updated_at", { ascending: false })
      .limit(40);
    if (error) throw new Error(error.message);
    for (const d of ((data as Json[] | null) ?? [])) {
      const url = String(d?.png_url ?? "").trim();
      if (!url || !/^https:\/\//i.test(url)) continue;
      const path = String(d?.png_path ?? "").trim();
      if (path) seen.add(path);
      out.push({ name: String(d?.title ?? "").trim() || "Untitled design", url, kind: "design" });
    }
  } catch (e) {
    // A business that has never opened the studio has no designs and no PNGs;
    // that is not a failure, and the photographs below still answer.
    console.warn("[phoxta] designs unavailable to the picture search:", String((e as Error)?.message || e));
  }

  try {
    const { data, error } = await admin.storage.from(BUCKET).list(orgId, {
      limit: 100,
      sortBy: { column: "created_at", order: "desc" },
    });
    if (error) throw new Error(error.message);
    for (const o of ((data as Json[] | null) ?? [])) {
      const file = String(o?.name ?? "");
      // Storage keeps a hidden placeholder object so an empty folder survives.
      if (!o?.id || !file || file === ".emptyFolderPlaceholder") continue;
      if (!SENDABLE_EXT.test(file)) continue;
      const path = `${orgId}/${file}`;
      // A design's own render is already in the list under its real title.
      if (seen.has(path)) continue;
      out.push({ name: assetLabel(file), url: admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl, kind: "photo" });
    }
  } catch (e) {
    console.warn("[phoxta] picture library unreadable:", String((e as Error)?.message || e));
  }

  const scored = out.map((p, i) => ({ p, score: pictureScore(p.name, query), i }));
  const matched = scored.filter((s) => s.score > 0);
  // No word matched anything. The list is NOT handed over unfiltered: showing
  // the model six unrelated pictures is how it ends up attaching one of them.
  if (matched.length === 0) return [];
  matched.sort((a, b) => (b.score - a.score) || (a.i - b.i));
  return matched.slice(0, PICTURE_SHORTLIST).map((s, i) => ({ ref: `pic${i + 1}`, ...s.p }));
}

// ---------------------------------------------------------------------------
// Time helpers (business-hours slot generation in the org's timezone)
// ---------------------------------------------------------------------------
function tzParts(tz: string, at: Date): Record<string, string> {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(at)) p[part.type] = part.value;
  return p;
}

function tzOffsetMs(tz: string, at: Date): number {
  try {
    const p = tzParts(tz, at);
    const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
    return asUtc - at.getTime();
  } catch {
    return 0; // unknown tz → behave as UTC
  }
}

/** The UTC instant of local wall time (y, m, d, hh, mm) in tz (DST-aware). */
function zonedUtc(tz: string, y: number, m: number, d: number, hh: number, mm: number): Date {
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  let ts = wall - tzOffsetMs(tz, new Date(wall));
  ts = wall - tzOffsetMs(tz, new Date(ts)); // second pass refines across DST edges
  return new Date(ts);
}

/** Today's calendar date in tz. */
function localToday(tz: string): { y: number; m: number; d: number } {
  try {
    const p = tzParts(tz, new Date());
    return { y: +p.year, m: +p.month, d: +p.day };
  } catch {
    const now = new Date();
    return { y: now.getUTCFullYear(), m: now.getUTCMonth() + 1, d: now.getUTCDate() };
  }
}

const pad2 = (n: number) => String(n).padStart(2, "0");

function parseDay(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Blueprint covers (platform marketplace cards)
// ---------------------------------------------------------------------------
// Server-side twin of src/lib/blueprintCover.ts: curated storefront screenshots
// win over blueprints.cover_url (generic stock), and nothing ever renders a
// broken image. Absolute URLs because the card can be shown on any origin.
const PLATFORM_SITE = "https://www.phoxta.com";
const BLUEPRINT_COVERS: Record<string, string> = {
  carento: `${PLATFORM_SITE}/assets/imgs/pages/FS1.webp`,
  "niche-apparel": `${PLATFORM_SITE}/assets/imgs/pages/FS.webp`,
  travel: `${PLATFORM_SITE}/assets/imgs/pages/FS2.webp`,
  "restaurant-orders": `${PLATFORM_SITE}/assets/imgs/pages/FS3.webp`,
  gearo: `${PLATFORM_SITE}/assets/imgs/pages/FS4.webp`,
};
function blueprintCoverUrl(slug?: string | null, dbCoverUrl?: string | null): string {
  if (slug && BLUEPRINT_COVERS[slug]) return BLUEPRINT_COVERS[slug];
  if (dbCoverUrl && /^https?:\/\//i.test(dbCoverUrl)) return dbCoverUrl;
  return `${PLATFORM_SITE}/assets/imgs/pages/FS.webp`;
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------
export function agentToolRunner(admin: SupabaseClient, orgId: string, ctx: AgentCtx, mode: BookingMode = "appointments") {
  // This runner backs the PUBLIC storefront/phone agent — anyone on the internet.
  // Retrieval is therefore restricted to published content; see PUBLIC_SOURCE_TYPES.
  const readRun = toolRunner(admin, orgId, { audience: "public" });

  async function findService(name?: string): Promise<{ id: string; name: string; duration_min: number } | null> {
    if (!name) return null;
    const { data } = await admin
      .from("services")
      .select("id, name, duration_min")
      .eq("organization_id", orgId)
      .ilike("name", `%${name}%`)
      .limit(1)
      .maybeSingle();
    return (data as { id: string; name: string; duration_min: number } | null) ?? null;
  }

  async function findProduct(name: string): Promise<{ id: string; name: string; price_cents: number; currency: string; stock: number } | null> {
    const { data } = await admin
      .from("products")
      .select("id, name, price_cents, currency, stock")
      .eq("organization_id", orgId)
      .eq("status", "active")
      .ilike("name", `%${name}%`)
      .limit(1)
      .maybeSingle();
    return (data as Json) ?? null;
  }

  async function listResources(): Promise<Json[]> {
    const { data } = await admin
      .from("products")
      .select("name, price_cents, currency, stock")
      .eq("organization_id", orgId)
      .eq("status", "active")
      .gt("stock", 0)
      .limit(30);
    return (data as Json[] | null) ?? [];
  }

  /** The owner's configured hours, or null when nothing usable is configured. */
  async function loadHours(): Promise<{ tz: string; days: number[]; openMin: number; closeMin: number } | null> {
    const { data } = await admin.from("agent_config").select("business_hours").eq("organization_id", orgId).maybeSingle();
    const hours = (data as Json)?.business_hours;
    if (!hours || typeof hours !== "object") return null;
    const [oh, om] = String(hours.open ?? "09:00").split(":").map(Number);
    const [ch, cm] = String(hours.close ?? "17:00").split(":").map(Number);
    if (![oh, om, ch, cm].every(Number.isFinite)) return null;
    const openMin = oh * 60 + (om || 0);
    const closeMin = ch * 60 + (cm || 0);
    if (closeMin <= openMin) return null;
    const days: number[] = Array.isArray(hours.days) && hours.days.length ? hours.days.map(Number) : [1, 2, 3, 4, 5];
    return { tz: String(hours.tz || "UTC"), days, openMin, closeMin };
  }

  /** Existing pending/confirmed bookings as busy [startMs, endMs) intervals. */
  async function loadBusy(fromMs: number, toMs: number): Promise<[number, number][]> {
    const { data } = await admin
      .from("bookings")
      .select("start_at, services(duration_min)")
      .eq("organization_id", orgId)
      .in("status", ["pending", "confirmed"])
      // include bookings that started up to a day before the window but may still overlap it
      .gte("start_at", new Date(fromMs - 86400000).toISOString())
      .lte("start_at", new Date(toMs).toISOString());
    return (((data as Json[] | null) ?? []) as Json[]).map((b) => {
      const s = new Date(b.start_at).getTime();
      const durMin = Number(b.services?.duration_min) || 60;
      return [s, s + durMin * 60000] as [number, number];
    });
  }

  return async (name: string, input: Json): Promise<string> => {
    // Intercepted here (not in tools.ts) because only this runner has ctx:
    // the platform agent's blueprint answers become real cards — image, price,
    // demo + buy buttons — instead of a markdown list of bare URLs.
    if (name === "list_blueprints") {
      const { data } = await admin
        .from("blueprints")
        .select("id, name, slug, tagline, description, price_cents, currency, vertical, demo_url, cover_url")
        .eq("status", "live")
        .order("name");
      const rows = ((data as Json[] | null) ?? []);
      if (!rows.length) return "No blueprints are currently available to buy.";
      ctx.cards = rows.slice(0, 8).map((b) => {
        const links: CardLink[] = [];
        if (typeof b.demo_url === "string" && /^https?:\/\//i.test(b.demo_url)) {
          links.push({ label: "View demo", url: b.demo_url });
        }
        // No public /marketplace/:slug route exists — the buyable grid at
        // /marketplace filters by ?q= over name/tagline, so link there.
        links.push({
          label: "Buy on Phoxta",
          url: `${PLATFORM_SITE}/marketplace?q=${encodeURIComponent(String(b.name ?? b.slug ?? ""))}`,
        });
        return {
          id: String(b.id ?? b.slug ?? b.name),
          name: String(b.name ?? ""),
          description: String(b.description ?? b.tagline ?? ""),
          price_cents: Number(b.price_cents) || 0,
          currency: String(b.currency || "GBP"),
          image_url: blueprintCoverUrl(b.slug, b.cover_url),
          tagline: (b.tagline as string | null) ?? null,
          links,
        };
      });
      const catalogue = rows.map((b) => ({
        name: b.name, slug: b.slug, tagline: b.tagline, price_cents: b.price_cents,
        currency: b.currency, vertical: b.vertical, demo_url: b.demo_url,
      }));
      // Web chat renders the cards, so the model gets no URLs to paste and an
      // explicit brief. Text channels (SMS/voice/WhatsApp) ignore cards, so
      // there the model keeps the full rows — demo links included.
      if ((ctx.channel ?? "web") === "web") {
        return JSON.stringify({
          note:
            "Rich cards for these blueprints (cover image, price, demo + buy buttons) are attached to your reply and shown to the customer. " +
            "Reply with ONE short intro line (e.g. \"Here's what's available:\") plus a direct answer to anything they asked — do NOT repeat the items as a markdown/bullet list and do NOT paste URLs.",
          blueprints: catalogue.map(({ demo_url: _demo, ...rest }) => rest),
        });
      }
      return JSON.stringify(catalogue);
    }
    if (!isWrite.has(name)) return readRun(name, input);

    // ---------------- check_availability (vertical-aware) ----------------
    // ── Customer self-service ────────────────────────────────────────────
    // Both factors are required and matched together: we fetch by email, then
    // require the reference to match too. One without the other yields nothing,
    // so neither can be used to enumerate the other.
    if (name === "lookup_order") {
      const ref = String(input.reference ?? "").trim().toLowerCase();
      const email = String(input.email ?? "").trim().toLowerCase();
      if (!ref || !email) return "I need both the order reference and the email address on the order before I can look it up.";
      const { data } = await admin
        .from("orders")
        .select("id, payment_reference, status, fulfillment_status, total_cents, currency, created_at, paid_at, tracking, customer_email")
        .eq("organization_id", orgId)
        .ilike("customer_email", email)
        .order("created_at", { ascending: false })
        .limit(25);
      const hit = (data ?? []).find((o: Json) => {
        const short = String(o.id ?? "").slice(0, 8).toLowerCase();
        const pref = String(o.payment_reference ?? "").toLowerCase();
        return ref === short || (pref && ref === pref) || ref === String(o.id ?? "").toLowerCase();
      });
      if (!hit) return "I couldn't find an order with that reference and email together. Ask the customer to double-check both — I won't show an order unless they match.";
      return JSON.stringify({
        reference: hit.payment_reference || String(hit.id).slice(0, 8),
        status: hit.status,
        fulfilment: hit.fulfillment_status,
        total_cents: hit.total_cents,
        currency: hit.currency,
        placed: hit.created_at,
        paid: hit.paid_at,
        tracking: hit.tracking ?? null,
      });
    }
    if (name === "lookup_booking") {
      const ref = String(input.reference ?? "").trim().toLowerCase();
      const email = String(input.email ?? "").trim().toLowerCase();
      if (!ref || !email) return "I need both a reference (or the date) and the email on the booking before I can look it up.";
      const [bk, rs] = await Promise.all([
        admin.from("bookings").select("id, start_at, status, customer_email, notes")
          .eq("organization_id", orgId).ilike("customer_email", email).limit(25),
        admin.from("reservations").select("id, start_date, end_date, status, units, total_cents, currency, customer_email")
          .eq("organization_id", orgId).ilike("customer_email", email).limit(25),
      ]);
      const matches = (id: unknown, day?: unknown) =>
        ref === String(id ?? "").slice(0, 8).toLowerCase() ||
        ref === String(id ?? "").toLowerCase() ||
        (day != null && ref === String(day).slice(0, 10));
      const b = (bk.data ?? []).find((r: Json) => matches(r.id, r.start_at));
      if (b) return JSON.stringify({ kind: "appointment", reference: String(b.id).slice(0, 8), when: b.start_at, status: b.status });
      const r = (rs.data ?? []).find((x: Json) => matches(x.id, x.start_date));
      if (r) return JSON.stringify({ kind: "reservation", reference: String(r.id).slice(0, 8), from: r.start_date, to: r.end_date, status: r.status, units: r.units, total_cents: r.total_cents, currency: r.currency });
      return "I couldn't find a booking with that reference and email together. Ask the customer to double-check both.";
    }

    if (name === "check_availability") {
      if (mode === "reservations") {
        const today = new Date().toISOString().slice(0, 10);
        const from = parseDay(input.start_date) ?? today;
        const to = parseDay(input.end_date) ?? new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
        if (!input.product_name) {
          const resources = await listResources();
          if (!resources.length) return "There are no bookable listings configured yet — I can't offer availability. Take the customer's details and the team will follow up.";
          return JSON.stringify({ note: "Ask which of these the customer wants, then re-check availability with product_name.", resources });
        }
        const prod = await findProduct(String(input.product_name));
        if (!prod) {
          const resources = await listResources();
          return `I couldn't find a listing matching "${input.product_name}". Bookable options: ${JSON.stringify(resources)}`;
        }
        const { data, error } = await admin.rpc("app_resource_availability", { p_product: prod.id, p_from: from, p_to: to });
        if (error) return `I couldn't check availability right now (${error.message}). Don't guess — offer to have the team confirm.`;
        return JSON.stringify({ resource: prod.name, rate_cents_per_day: prod.price_cents, currency: prod.currency, per_day: data ?? [] });
      }

      if (mode === "table") {
        const date = parseDay(input.date);
        return `We take table requests for ${date ?? "any upcoming date"} — there is no live table map, so never promise a specific table or time is free. Collect the date, preferred time and party size, submit the request with book_table, and tell the customer the restaurant will confirm it personally.`;
      }

      // appointments: real hours + service durations, org timezone.
      const hours = await loadHours();
      if (!hours) {
        return "I don't have the schedule configured for this business, so I can't offer specific times. Take the customer's preferred time and contact details and the team will confirm.";
      }
      const svc = await findService(input.service);
      if (input.service && !svc) {
        const { data: services } = await admin.from("services").select("name, duration_min").eq("organization_id", orgId).eq("active", true).limit(30);
        return `No service matches "${input.service}". Available services: ${JSON.stringify(services ?? [])}`;
      }
      const duration = svc?.duration_min || 60;
      const now = Date.now();
      const busy = await loadBusy(now, now + 14 * 86400000);
      const t0 = localToday(hours.tz);
      const base = Date.UTC(t0.y, t0.m - 1, t0.d);
      const slots: { start_at: string; local: string }[] = [];
      for (let day = 0; day <= 14 && slots.length < 8; day++) {
        const dt = new Date(base + day * 86400000);
        const y = dt.getUTCFullYear();
        const mo = dt.getUTCMonth() + 1;
        const dd = dt.getUTCDate();
        if (!hours.days.includes(dt.getUTCDay())) continue;
        for (let mins = hours.openMin; mins + duration <= hours.closeMin && slots.length < 8; mins += duration) {
          const start = zonedUtc(hours.tz, y, mo, dd, Math.floor(mins / 60), mins % 60);
          const s = start.getTime();
          const e = s + duration * 60000;
          if (s < now + 3600000) continue; // at least an hour's notice
          if (busy.some(([bs, be]) => s < be && bs < e)) continue;
          slots.push({ start_at: start.toISOString(), local: `${y}-${pad2(mo)}-${pad2(dd)} ${pad2(Math.floor(mins / 60))}:${pad2(mins % 60)} (${hours.tz})` });
        }
      }
      if (!slots.length) return JSON.stringify({ timezone: hours.tz, slot_minutes: duration, available: [], note: "No open slots in the next 14 days — offer a callback instead." });
      return JSON.stringify({ timezone: hours.tz, slot_minutes: duration, service: svc?.name ?? null, available: slots });
    }

    // ---------------- reservations mode ----------------
    if (name === "create_reservation") {
      if (mode !== "reservations") return "This business doesn't take date-range reservations.";
      const prod = await findProduct(String(input.product_name ?? ""));
      if (!prod) return `I couldn't find a listing matching "${input.product_name}" — re-check availability first to see what's bookable.`;
      const start = parseDay(input.start_date);
      const end = parseDay(input.end_date);
      if (!start || !end) return "I need valid start and end dates (YYYY-MM-DD) before reserving.";
      const customerName = String(input.customer_name || ctx.customer.name || "").trim();
      const customerEmail = String(input.customer_email || ctx.customer.email || "").trim();
      if (!customerEmail) return "I need the customer's email address before creating the reservation — please ask for it.";
      const units = Math.max(1, Math.round(Number(input.units) || 1));
      const { data, error } = await admin.rpc("app_request_reservation", {
        p_org: orgId,
        p_product: prod.id,
        p_customer_name: customerName,
        p_customer_email: customerEmail,
        p_start: start,
        p_end: end,
        p_units: units,
      });
      if (error) return `Could not reserve: ${error.message}`;
      const { data: resv } = await admin.from("reservations").select("total_cents, currency").eq("id", data as string).maybeSingle();
      const total = resv ? ` Total ${(resv as Json).currency} ${(((resv as Json).total_cents ?? 0) / 100).toFixed(2)}.` : "";
      ctx.actions.push(`Reserved ${prod.name} ${start} → ${end}`);
      return `Reservation requested (${data}) for ${prod.name}, ${start} to ${end}.${total} Status: pending — the business will confirm.`;
    }

    // ---------------- table mode ----------------
    if (name === "book_table") {
      if (mode !== "table") return "This business doesn't take table reservations.";
      const date = parseDay(input.date);
      if (!date) return "I need the reservation date (YYYY-MM-DD) first.";
      const customerName = String(input.customer_name || ctx.customer.name || "").trim();
      const customerEmail = String(input.customer_email || ctx.customer.email || "").trim();
      const customerPhone = String(input.customer_phone || ctx.customer.phone || "").trim();
      if (!customerEmail && !customerPhone) return "I need an email or phone number for the table request — please ask the customer.";
      const party = Math.max(1, Math.round(Number(input.party) || 1));
      const time = String(input.time ?? "").trim();
      const { data, error } = await admin.rpc("app_request_table", {
        p_org: orgId,
        p_name: customerName,
        p_email: customerEmail,
        p_date: date,
        p_time: time,
        p_party: party,
        p_notes: customerPhone ? `Phone: ${customerPhone}` : "",
      });
      if (error) return `Could not submit the table request: ${error.message}`;
      ctx.actions.push(`Requested a table for ${date}${time ? ` at ${time}` : ""} (${party} guests)`);
      return `Table request submitted (${data}) for ${date}${time ? ` at ${time}` : ""}, party of ${party}. The restaurant will confirm — present it as a request, not a confirmed table.`;
    }

    // ---------------- appointments mode ----------------
    if (name === "book_appointment") {
      if (mode !== "appointments") return "This business doesn't book appointment slots — use its reservation tools instead.";
      const start = new Date(String(input.start_at ?? ""));
      if (isNaN(start.getTime())) return "That start time is invalid — please confirm an exact date and time (ISO 8601).";
      const svc = await findService(input.service);
      const duration = svc?.duration_min || 60;
      const s = start.getTime();
      const e = s + duration * 60000;
      // Re-check the true overlap at insert time — never double-book.
      const busy = await loadBusy(s, e);
      if (busy.some(([bs, be]) => s < be && bs < e)) {
        return "That time conflicts with another booking and is no longer available. Re-check availability and offer the customer a different slot.";
      }
      const { data, error } = await admin
        .from("bookings")
        .insert({
          organization_id: orgId,
          service_id: svc?.id ?? null,
          contact_id: ctx.contactId,
          customer_name: input.customer_name || ctx.customer.name || "",
          customer_email: input.customer_email || ctx.customer.email || "",
          // Recorded so a phone-only caller can later be matched to their own
          // booking (see reschedule_appointment).
          customer_phone: ctx.customer.phone || "",
          start_at: start.toISOString(),
          status: "confirmed",
        })
        .select("id")
        .single();
      if (error) return `Could not book: ${error.message}`;
      ctx.actions.push(`Booked appointment for ${start.toLocaleString()}`);
      return `Booked (${(data as { id: string }).id}) for ${start.toISOString()}.`;
    }

    if (name === "reschedule_appointment") {
      // MUST be scoped to this customer. Previously the customer filter was only
      // applied when an email was known — so an SMS/voice caller (phone only, no
      // email) would silently match the ORG's most recent booking and reschedule
      // a different customer's appointment. Resolve identity by contact id, then
      // email, then phone; refuse rather than guess when we have none of them.
      let q = admin
        .from("bookings")
        .select("id")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (ctx.contactId) {
        q = q.eq("contact_id", ctx.contactId);
      } else if (ctx.customer.email) {
        q = q.eq("customer_email", ctx.customer.email);
      } else if (ctx.customer.phone) {
        q = q.eq("customer_phone", ctx.customer.phone);
      } else {
        return "I couldn't identify which booking is yours. Could you confirm the email address or phone number you booked with?";
      }

      const { data: b } = await q.maybeSingle();
      if (!b) return "No appointment found to reschedule.";
      await admin.from("bookings").update({ start_at: input.start_at, status: "confirmed" }).eq("id", (b as { id: string }).id);
      ctx.actions.push(`Rescheduled to ${new Date(input.start_at).toLocaleString()}`);
      return `Rescheduled to ${input.start_at}.`;
    }

    if (name === "capture_lead") {
      const email = String(input.email || ctx.customer.email || "").trim();
      const newName = String(input.name || ctx.customer.name || "").trim();
      const newPhone = String(input.phone || ctx.customer.phone || "").trim();
      const newNotes = String(input.notes ?? "").trim();
      let contactId: string | null = null;
      let existing: { id: string; notes: string | null } | null = null;
      if (email) {
        const { data } = await admin.from("crm_contacts").select("id, notes").eq("organization_id", orgId).eq("email", email).maybeSingle();
        existing = (data as { id: string; notes: string | null } | null) ?? null;
        contactId = existing?.id ?? null;
      }
      if (contactId && existing) {
        // MERGE, never destroy: only set fields we actually learned, and append
        // notes to what's already there instead of replacing it.
        const patch: Record<string, unknown> = {};
        if (newName) patch.name = newName;
        if (newPhone) patch.phone = newPhone;
        if (newNotes) patch.notes = existing.notes ? `${existing.notes}\n---\n${newNotes}` : newNotes;
        if (Object.keys(patch).length) await admin.from("crm_contacts").update(patch).eq("id", contactId);
      } else {
        const { data: created } = await admin
          .from("crm_contacts")
          .insert({
            organization_id: orgId,
            name: newName || "Lead",
            email,
            phone: newPhone,
            notes: newNotes,
            stage: "lead",
            source: `agent:${ctx.channel || "web"}`,
          })
          .select("id")
          .single();
        contactId = (created as { id: string } | null)?.id ?? null;
      }
      ctx.contactId = contactId;
      ctx.actions.push("Captured lead in CRM");
      return "Lead saved.";
    }

    if (name === "qualify_lead") {
      // The score belongs to THIS conversation. The contact's own lead_score is
      // maintained by the CRM scoring action — don't clobber it from here.
      if (ctx.conversationId) {
        await admin.from("conversations").update({ qualified: !!input.qualified, lead_score: Math.round(input.score ?? 0) }).eq("id", ctx.conversationId);
      }
      ctx.actions.push(`Qualified lead (${input.qualified ? "hot" : "not yet"}, score ${Math.round(input.score ?? 0)})`);
      return "Recorded.";
    }

    if (name === "create_ticket") {
      const { data: t, error } = await admin
        .from("tickets")
        .insert({ organization_id: orgId, contact_id: ctx.contactId, subject: input.subject, customer_name: ctx.customer.name || "", customer_email: ctx.customer.email || "", priority: "normal" })
        .select("id")
        .single();
      if (error) return `Could not open ticket: ${error.message}`;
      if (input.message) {
        await admin.from("ticket_messages").insert({ organization_id: orgId, ticket_id: (t as { id: string }).id, author: "customer", body: input.message });
      }
      ctx.actions.push("Opened support ticket");
      return "Ticket opened.";
    }

    if (name === "recommend_products") {
      // Selects the media columns too: without image_url the agent can only ever
      // describe a product, never show it. The rows are also stashed on ctx so
      // the caller can render real cards alongside the reply.
      const { data } = await admin
        .from("products")
        .select("id, name, description, price_cents, currency, image_url")
        .eq("organization_id", orgId)
        .eq("status", "active")
        .limit(40);
      const rows = (data ?? []) as ProductCard[];
      ctx.cards = rows.slice(0, 6);
      // The model gets no image URLs — it should reference products by name and
      // let the card carry the picture, rather than pasting links into prose.
      return JSON.stringify(rows.map(({ name: n, description, price_cents, currency }) => ({ name: n, description, price_cents, currency })));
    }

    if (name === "route_location") {
      const zip = input.zip || ctx.customer.zip || "";
      const { data: locId } = await admin.rpc("app_route_location", { p_org: orgId, p_zip: zip, p_service: input.service ?? "" });
      if (!locId) return "No matching location found.";
      const { data: loc } = await admin.from("locations").select("name, phone").eq("id", locId).maybeSingle();
      ctx.locationId = locId as string;
      if (ctx.conversationId) await admin.from("conversations").update({ location_id: locId }).eq("id", ctx.conversationId);
      ctx.actions.push(`Routed to ${(loc as { name: string } | null)?.name ?? "branch"}`);
      return JSON.stringify(loc ?? { name: "branch" });
    }

    if (name === "schedule_callback") {
      const due = input.when ? new Date(input.when) : new Date();
      await admin.from("outbound_tasks").insert({
        organization_id: orgId,
        type: "instant_callback",
        contact_id: ctx.contactId,
        conversation_id: ctx.conversationId,
        channel: input.channel || "call",
        to_ref: ctx.customer.phone || ctx.customer.email || "",
        customer_name: ctx.customer.name || "",
        due_at: isNaN(due.getTime()) ? new Date().toISOString() : due.toISOString(),
        payload: { reason: input.reason ?? "" },
      });
      ctx.actions.push("Scheduled a callback");
      return "Callback scheduled.";
    }

    // ── The business's own pictures ────────────────────────────────────────
    if (name === "find_picture") {
      const found = await searchPictures(admin, orgId, String(input.query ?? ""));
      ctx.pictureShortlist = found;
      if (found.length === 0) {
        return "This business has no pictures in its library that match that. Answer in words — do not describe a picture you cannot send.";
      }
      return JSON.stringify(
        found.map((p) => ({ ref: p.ref, name: p.name, kind: p.kind })),
      );
    }

    if (name === "attach_picture") {
      const ref = String(input.ref ?? "").trim();
      const reason = String(input.reason ?? "").trim();
      const shortlist = ctx.pictureShortlist ?? [];
      if (shortlist.length === 0) {
        return "Call find_picture first — you can only attach a picture this business actually has.";
      }
      const hit = shortlist.find((p) => p.ref === ref);
      if (!hit) {
        return `There is no picture with the reference "${ref}". Use one of: ${shortlist.map((p) => p.ref).join(", ")}.`;
      }
      if (!reason) return "Say why this picture answers the customer's question, then attach it.";
      // ONE per reply. WhatsApp carries a single image per message, and an agent
      // that attaches three has stopped answering and started decorating.
      ctx.media = [{ type: "image", url: hit.url, alt: hit.name }];
      ctx.pictureReason = reason;
      ctx.actions.push(`Showed the customer "${hit.name}"`);
      return `Attached "${hit.name}". Write your reply as normal — refer to the picture naturally; it travels with the message. Do not paste its link.`;
    }

    if (name === "escalate_to_human") {
      if (ctx.conversationId) await admin.from("conversations").update({ status: "escalated" }).eq("id", ctx.conversationId);
      const { data: members } = await admin.from("organization_memberships").select("user_id").eq("organization_id", orgId).in("role", ["owner", "admin"]);
      const rows = ((members as { user_id: string }[] | null) ?? []).map((m) => ({
        user_id: m.user_id,
        title: "Conversation escalated",
        body: input.reason || "A customer conversation needs a human.",
        kind: "info",
        link: "/dashboard/businesses",
      }));
      if (rows.length) await admin.from("notifications").insert(rows);
      ctx.actions.push("Escalated to a human");
      return "Escalated to your team.";
    }

    return "Unknown tool.";
  };
}
