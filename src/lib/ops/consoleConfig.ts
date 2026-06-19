// Config-driven operating console. One console, configured per business vertical:
// which modules show, what the commerce module is called, the item noun, and which
// booking model (none / date-range reservations / appointments) applies. Shared
// modules (CRM, Content, Helpdesk, Marketing, Invoicing, AI Agent) stay common.

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

const MODULES: Record<string, OpsModuleDef> = {
  overview: { seg: "", label: "Overview", end: true },
  crm: { seg: "crm", label: "CRM" },
  commerce: { seg: "commerce", label: "Commerce" },
  reservations: { seg: "reservations", label: "Reservations" },
  bookings: { seg: "bookings", label: "Bookings" },
  invoicing: { seg: "invoicing", label: "Invoicing" },
  content: { seg: "content", label: "Content" },
  helpdesk: { seg: "helpdesk", label: "Helpdesk" },
  marketing: { seg: "marketing", label: "Marketing" },
  agent: { seg: "agent", label: "AI Agent" },
  google: { seg: "google", label: "Google Workspace" },
};

const RETAIL: VerticalConsole = {
  commerceLabel: "Catalog",
  itemNoun: "Product",
  booking: "none",
  modules: ["overview", "commerce", "crm", "content", "marketing", "helpdesk", "invoicing", "agent"],
};
const RENTAL: VerticalConsole = {
  commerceLabel: "Fleet",
  itemNoun: "Vehicle",
  booking: "reservations",
  modules: ["overview", "commerce", "reservations", "crm", "content", "marketing", "helpdesk", "invoicing", "agent"],
};
const EXPERIENCES: VerticalConsole = {
  commerceLabel: "Experiences",
  itemNoun: "Experience",
  booking: "reservations",
  modules: ["overview", "commerce", "reservations", "crm", "content", "marketing", "helpdesk", "agent"],
};
const STAYS: VerticalConsole = {
  commerceLabel: "Listings",
  itemNoun: "Listing",
  booking: "reservations",
  modules: ["overview", "commerce", "reservations", "crm", "content", "marketing", "helpdesk", "invoicing", "agent"],
};
const SERVICES: VerticalConsole = {
  commerceLabel: "Services",
  itemNoun: "Service",
  booking: "appointments",
  modules: ["overview", "bookings", "crm", "content", "marketing", "helpdesk", "invoicing", "agent"],
};
const RESTAURANT: VerticalConsole = {
  commerceLabel: "Menu",
  itemNoun: "Menu item",
  booking: "reservations", // table reservations
  modules: ["overview", "commerce", "reservations", "crm", "content", "marketing", "helpdesk", "invoicing", "agent"],
};
// Default: show everything (unknown / generic vertical).
const DEFAULT: VerticalConsole = {
  commerceLabel: "Commerce",
  itemNoun: "Product",
  booking: "reservations",
  modules: ["overview", "crm", "commerce", "reservations", "bookings", "invoicing", "content", "helpdesk", "marketing", "agent"],
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

export function resolveConsole(vertical: string | null | undefined): VerticalConsole {
  const raw = (vertical || "").toLowerCase().trim();
  if (BY_VERTICAL[raw]) return BY_VERTICAL[raw];
  // Compound verticals like "Furniture / eCommerce" → match on any known token.
  for (const tok of raw.split(/[^a-z0-9]+/).filter(Boolean)) {
    if (BY_VERTICAL[tok]) return BY_VERTICAL[tok];
  }
  return DEFAULT;
}

export function consoleTabs(cfg: VerticalConsole): OpsModuleDef[] {
  const tabs = cfg.modules.map((k) => {
    const m = MODULES[k] ?? MODULES.overview;
    if (k === "commerce") return { ...m, label: cfg.commerceLabel };
    return m;
  });
  // Google Workspace is universal — always available as its own top-level tab.
  tabs.push(MODULES.google);
  return tabs;
}
