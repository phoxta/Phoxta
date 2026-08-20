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
  inbox: { seg: "inbox", label: "Inbox" },
  crm: { seg: "crm", label: "CRM" },
  commerce: { seg: "commerce", label: "Commerce" },
  reservations: { seg: "reservations", label: "Reservations" },
  bookings: { seg: "bookings", label: "Bookings" },
  invoicing: { seg: "invoicing", label: "Invoicing" },
  marketing: { seg: "marketing", label: "Marketing" },
  agent: { seg: "agent", label: "AI Agent" },
  settings: { seg: "settings", label: "Settings" },
};

const RETAIL: VerticalConsole = {
  commerceLabel: "Catalog",
  itemNoun: "Product",
  booking: "none",
  modules: ["overview", "inbox", "commerce", "crm", "marketing", "invoicing", "agent", "settings"],
};
const RENTAL: VerticalConsole = {
  commerceLabel: "Fleet",
  itemNoun: "Vehicle",
  booking: "reservations",
  modules: ["overview", "inbox", "commerce", "reservations", "crm", "marketing", "invoicing", "agent", "settings"],
};
// Car SALES (a dealership or marketplace) is a different business from rental:
// the vehicle is sold once, not booked by the day. So there is no reservations
// surface — but there IS an appointments one, because the thing a buyer books
// is a TEST DRIVE. Enquiries and part-exchange valuations arrive in the Inbox.
const SALES: VerticalConsole = {
  commerceLabel: "Inventory",
  itemNoun: "Vehicle",
  booking: "appointments",
  modules: ["overview", "inbox", "commerce", "bookings", "crm", "marketing", "invoicing", "agent", "settings"],
};
const EXPERIENCES: VerticalConsole = {
  commerceLabel: "Experiences",
  itemNoun: "Experience",
  booking: "reservations",
  modules: ["overview", "inbox", "commerce", "reservations", "crm", "marketing", "agent", "settings"],
};
const STAYS: VerticalConsole = {
  commerceLabel: "Listings",
  itemNoun: "Listing",
  booking: "reservations",
  modules: ["overview", "inbox", "commerce", "reservations", "crm", "marketing", "invoicing", "agent", "settings"],
};
const SERVICES: VerticalConsole = {
  commerceLabel: "Services",
  itemNoun: "Service",
  booking: "appointments",
  modules: ["overview", "inbox", "bookings", "crm", "marketing", "invoicing", "agent", "settings"],
};
// Digital-first kitchen: the business is online ordering (delivery/collection)
// plus special orders — catering, bulk and custom bakes. There is no dining
// room, so the Reservations module is deliberately absent; a special order
// arrives as a ticket in the Inbox, where it is answered and quoted.
const RESTAURANT: VerticalConsole = {
  commerceLabel: "Menu",
  itemNoun: "Menu item",
  booking: "none",
  modules: ["overview", "inbox", "commerce", "crm", "marketing", "invoicing", "agent", "settings"],
};
// Default: generic / unknown vertical. One booking surface only (reservations).
const DEFAULT: VerticalConsole = {
  commerceLabel: "Commerce",
  itemNoun: "Product",
  booking: "reservations",
  modules: ["overview", "inbox", "crm", "commerce", "reservations", "invoicing", "marketing", "agent", "settings"],
};

// Map vertical synonyms → a console config.
const BY_VERTICAL: Record<string, VerticalConsole> = {
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
