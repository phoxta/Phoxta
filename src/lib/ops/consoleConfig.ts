// Config-driven operating console. One console, configured per business vertical:
// which modules show, what the commerce module is called, the item noun, and which
// booking model (none / date-range reservations / appointments) applies. Shared
// modules (Inbox, CRM, Marketing, Invoicing, AI Agent, Settings) stay common.

export type OpsModuleDef = { seg: string; label: string; end?: boolean };

export type VerticalConsole = {
  /** Display label for the commerce module + page (Catalog / Fleet / Experiences…). */
  commerceLabel: string;
  /** Singular noun for a catalogue item (Product / Vehicle / Experience…). */
  itemNoun: string;
  /** Booking model this vertical uses. */
  booking: "none" | "reservations" | "appointments";
  /** Ordered module segments to show in the nav. */
  modules: string[];
};

export const MODULES: Record<string, OpsModuleDef> = {
  overview: { seg: "", label: "Overview", end: true },
  // Everything customer-messaging lives in ONE tab with an internal rail:
  // Inbox · Audience · Flows · Journeys · Broadcasts · Channels · Agent ·
  // Insights. It absorbed the old Inbox, Marketing and AI Agent tabs.
  engage: { seg: "engage", label: "Engage" },
  // The owner's copilot — a different product from the customer-facing agent,
  // so it keeps its own tab when Engage absorbed the rest of the agent module.
  operator: { seg: "operator", label: "Operator" },
  inbox: { seg: "inbox", label: "Inbox" },
  crm: { seg: "crm", label: "CRM" },
  commerce: { seg: "commerce", label: "Commerce" },
  reservations: { seg: "reservations", label: "Reservations" },
  bookings: { seg: "bookings", label: "Bookings" },
  invoicing: { seg: "invoicing", label: "Invoicing" },
  marketing: { seg: "marketing", label: "Marketing" },
  // Public knowledge base: articles written here publish at /help/:org on the
  // marketing site, and feed the AI agent's knowledge on publish. Key equals
  // seg (like every module) so OperatingLayout's business-switcher tab check
  // (`modules.includes(seg)`) keeps working.
  "help-center": { seg: "help-center", label: "Help Center" },
  agent: { seg: "agent", label: "AI Agent" },
  platform: { seg: "platform", label: "Platform" },
  settings: { seg: "settings", label: "Settings" },
};

const RETAIL: VerticalConsole = {
  commerceLabel: "Catalog",
  itemNoun: "Product",
  booking: "none",
  modules: ["overview", "engage", "commerce", "crm", "invoicing", "help-center", "operator", "settings"],
};
const RENTAL: VerticalConsole = {
  commerceLabel: "Fleet",
  itemNoun: "Vehicle",
  booking: "reservations",
  modules: ["overview", "engage", "commerce", "reservations", "crm", "invoicing", "help-center", "operator", "settings"],
};
// Car SALES (a dealership or marketplace) is a different business from rental:
// the vehicle is sold once, not booked by the day. So there is no reservations
// surface — but there IS an appointments one, because the thing a buyer books
// is a TEST DRIVE. Enquiries and part-exchange valuations arrive in the Inbox.
const SALES: VerticalConsole = {
  commerceLabel: "Inventory",
  itemNoun: "Vehicle",
  booking: "appointments",
  modules: ["overview", "engage", "commerce", "bookings", "crm", "invoicing", "help-center", "operator", "settings"],
};
const EXPERIENCES: VerticalConsole = {
  commerceLabel: "Experiences",
  itemNoun: "Experience",
  booking: "reservations",
  modules: ["overview", "engage", "commerce", "reservations", "crm", "help-center", "operator", "settings"],
};
const STAYS: VerticalConsole = {
  commerceLabel: "Listings",
  itemNoun: "Listing",
  booking: "reservations",
  modules: ["overview", "engage", "commerce", "reservations", "crm", "invoicing", "help-center", "operator", "settings"],
};
const SERVICES: VerticalConsole = {
  commerceLabel: "Services",
  itemNoun: "Service",
  booking: "appointments",
  modules: ["overview", "engage", "bookings", "crm", "invoicing", "help-center", "operator", "settings"],
};
// Digital-first kitchen: the business is online ordering (delivery/collection)
// plus special orders — catering, bulk and custom bakes. There is no dining
// room, so the Reservations module is deliberately absent; a special order
// arrives as a ticket in the Inbox, where it is answered and quoted.
const RESTAURANT: VerticalConsole = {
  commerceLabel: "Menu",
  itemNoun: "Menu item",
  booking: "none",
  modules: ["overview", "engage", "commerce", "crm", "invoicing", "help-center", "operator", "settings"],
};
// Default: generic / unknown vertical. One booking surface only (reservations).
// Phoxta itself. It runs on the same console as any tenant — Inbox for
// prospects, CRM for customers, Marketing, Invoicing, its own AI agent — plus a
// Platform module for the cross-tenant questions no tenant console can answer.
//
// No commerce module: what Phoxta sells lives in `blueprints`, not `products`,
// so a Catalog tab would render an empty product list. Blueprints are managed
// in the Platform module instead.
const PLATFORM: VerticalConsole = {
  commerceLabel: "Blueprints",
  itemNoun: "Blueprint",
  booking: "none",
  modules: ["overview", "platform", "engage", "crm", "invoicing", "help-center", "operator", "settings"],
};

const DEFAULT: VerticalConsole = {
  commerceLabel: "Commerce",
  itemNoun: "Product",
  booking: "reservations",
  modules: ["overview", "engage", "crm", "commerce", "reservations", "invoicing", "help-center", "operator", "settings"],
};

// Map vertical synonyms → a console config.
const BY_VERTICAL: Record<string, VerticalConsole> = {
  platform: PLATFORM, phoxta: PLATFORM,
  retail: RETAIL, fashion: RETAIL, apparel: RETAIL, ecommerce: RETAIL, shop: RETAIL,
  furniture: RETAIL, store: RETAIL, goods: RETAIL, homeware: RETAIL,
  // "automotive"/"car" on its own means selling cars far more often than renting
  // them, so those map to SALES; only the explicitly-rental words stay on RENTAL.
  automotive: SALES, car: SALES, cars: SALES, dealership: SALES, dealer: SALES,
  "car-sales": SALES, "car-dealership": SALES, motors: SALES, vehicles: SALES,
  "car-rental": RENTAL, rental: RENTAL, rentals: RENTAL, hire: RENTAL, "car-hire": RENTAL,
  experience: EXPERIENCES, experiences: EXPERIENCES, tours: EXPERIENCES, activities: EXPERIENCES,
  travel: STAYS, stays: STAYS, stay: STAYS, hotel: STAYS, hospitality: STAYS, lodging: STAYS,
  services: SERVICES, service: SERVICES, salon: SERVICES, cleaning: SERVICES, appointments: SERVICES,
  restaurant: RESTAURANT, food: RESTAURANT, cafe: RESTAURANT, dining: RESTAURANT, kitchen: RESTAURANT,
};

// Priority phrase rules, checked over the WHOLE lowercased vertical string BEFORE
// token matching. This is what keeps "car wash" / "automotive repair" in SERVICES
// instead of the token match ("car" / "automotive") dragging them into RENTAL.
const PHRASE_RULES: Array<{ needles: string[]; console: VerticalConsole }> = [
  {
    needles: [
      "wash", "repair", "salon", "barber", "spa", "gym", "clinic", "fitness",
      "beauty", "photograph", "cleaning", "plumb", "tutor", "detailing",
    ],
    console: SERVICES,
  },
  // Must beat the token pass: "Car Rental" tokenises to ["car","rental"] and
  // "car" now means SALES, so without this a rental business would be handed a
  // sales console.
  { needles: ["rental", "rent-a", "rent a", "hire", "leasing"], console: RENTAL },
  { needles: ["bakery", "boutique", "jewel", "grocer"], console: RETAIL },
  { needles: ["coffee", "cafe", "bistro", "diner"], console: RESTAURANT },
];

export function resolveConsole(vertical: string | null | undefined): VerticalConsole {
  const raw = (vertical || "").toLowerCase().trim();
  if (!raw) return DEFAULT;
  if (BY_VERTICAL[raw]) return BY_VERTICAL[raw];
  // Punctuation-insensitive pass: "E-Commerce" / "e commerce" / "E‑Commerce"
  // must all reach the `ecommerce` key, otherwise a retail store silently
  // falls through to the everything-console (wrong tabs, wrong KPIs).
  const squashed = raw.replace(/[^a-z0-9]/g, "");
  if (BY_VERTICAL[squashed]) return BY_VERTICAL[squashed];
  if (squashed.endsWith("s") && BY_VERTICAL[squashed.slice(0, -1)]) return BY_VERTICAL[squashed.slice(0, -1)];
  // Priority pass: substring rules over the whole string (before token matching).
  for (const rule of PHRASE_RULES) {
    if (rule.needles.some((n) => raw.includes(n))) return rule.console;
  }
  // Compound verticals like "Furniture / eCommerce" → match on any known token,
  // also trying the singular form so "hotels" / "restaurants" resolve.
  for (const tok of raw.split(/[^a-z0-9]+/).filter(Boolean)) {
    if (BY_VERTICAL[tok]) return BY_VERTICAL[tok];
    if (tok.endsWith("s") && BY_VERTICAL[tok.slice(0, -1)]) return BY_VERTICAL[tok.slice(0, -1)];
  }
  return DEFAULT;
}

export function consoleTabs(cfg: VerticalConsole): OpsModuleDef[] {
  return cfg.modules
    .filter((k) => Boolean(MODULES[k])) // drop unknown keys instead of aliasing to Overview
    .map((k) => {
      const m = MODULES[k];
      if (k === "commerce") return { ...m, label: cfg.commerceLabel };
      return m;
    });
}
