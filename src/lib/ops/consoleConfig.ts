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
const RESTAURANT: VerticalConsole = {
  commerceLabel: "Menu",
  itemNoun: "Menu item",
  booking: "reservations", // table reservations
  modules: ["overview", "inbox", "commerce", "reservations", "crm", "marketing", "invoicing", "agent", "settings"],
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
  automotive: RENTAL, car: RENTAL, cars: RENTAL, "car-rental": RENTAL, rental: RENTAL, rentals: RENTAL,
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
  { needles: ["bakery", "boutique", "jewel", "grocer"], console: RETAIL },
  { needles: ["coffee", "cafe", "bistro", "diner"], console: RESTAURANT },
];

export function resolveConsole(vertical: string | null | undefined): VerticalConsole {
  const raw = (vertical || "").toLowerCase().trim();
  if (!raw) return DEFAULT;
  if (BY_VERTICAL[raw]) return BY_VERTICAL[raw];
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
