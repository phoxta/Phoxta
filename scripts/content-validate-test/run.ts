// Does the content engine actually refuse to invent an offer?
//
// The prompts say "never invent a discount". This checks the thing that makes
// that true regardless of what the model does. Run: npm run test:content-validate
import {
  validateStrategy, validateCalendar, validateSituation, validateOffers, realAnchors,
} from "../../supabase/functions/content-plan-run/validate.ts";
import type { BusinessContext } from "../../supabase/functions/_shared/businessContext.ts";

let failures = 0;
const check = (name: string, cond: boolean, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : ` — ${detail}`}`);
  if (!cond) failures++;
};

const ctx = {
  org: { name: "Bright Dental", vertical: "dental", tagline: "", description: "", timezone: "UTC", hours: null, address: "", phone: "", email: "" },
  voice: { persona: "", tone: "", procedures: "", memory: "" },
  catalogue: {
    products: [{ name: "Whitening Kit", description: "", price: "GBP 80.00", stock: 4, status: "active" }],
    services: [{ name: "Basic Cleaning", description: "", price: "GBP 80.00", durationMin: 30 }],
  },
  offers: [{ code: "SUMMER20", what: "20% off", expires: "2026-09-30" }],
  proof: [], sells: [],
  demand: { bookings30d: 0, reservations30d: 0, busiestDays: [] },
  audience: { segments: [], stages: [] },
  inbox: { intents: [], questions: [] },
  channels: [{ platform: "instagram", handle: "bright" }, { platform: "linkedin", handle: "bright" }],
  history: { lastPlanTitle: "", recentAngles: [], recentCaptions: [] },
  dossier: [], coverage: [],
} as unknown as BusinessContext;

// ── anchors ─────────────────────────────────────────────────────────────
{
  const a = realAnchors(ctx);
  check("real anchors include the promo code", a.has("summer20"));
  check("real anchors include a product", a.has("whitening kit"));
  check("real anchors include a service", a.has("basic cleaning"));
  check("real anchors exclude an invention", !a.has("blackfriday50"));
}

// ── the headline case: an invented discount ─────────────────────────────
{
  const { strategy, dropped } = validateStrategy({
    pillars: [{ key: "proof", share: 50 }, { key: "teach", share: 50 }],
    campaigns: [
      { key: "real", name: "Summer push", anchor: { kind: "promo", ref: "SUMMER20" } },
      { key: "fake", name: "Black Friday 50", anchor: { kind: "promo", ref: "BLACKFRIDAY50" } },
    ],
  }, ctx);
  check("invented promo campaign is dropped", strategy.campaigns.length === 1, JSON.stringify(strategy.campaigns));
  check("the surviving campaign is the real one", strategy.campaigns[0]?.key === "real");
  check("the drop is reported, not silent", dropped.some((d) => d.why.includes("BLACKFRIDAY50")), JSON.stringify(dropped));
}

// ── a discount claimed on a product that isn't discounted ───────────────
{
  const { strategy, dropped } = validateStrategy({
    pillars: [{ key: "a", share: 100 }],
    campaigns: [{ key: "p", name: "Kit deal", anchor: { kind: "promo", ref: "Whitening Kit" } }],
  }, ctx);
  check("promo anchored on a product (not a code) is dropped", strategy.campaigns.length === 0, JSON.stringify(strategy.campaigns));
  check("that drop explains itself", dropped.some((d) => d.why.includes("not a live promo code")));
}

// ── seasons are allowed without a table row ─────────────────────────────
{
  const { strategy } = validateStrategy({
    pillars: [{ key: "a", share: 100 }],
    campaigns: [{ key: "s", name: "Back to school", anchor: { kind: "season", ref: "September" } }],
  }, ctx);
  check("a seasonal campaign survives", strategy.campaigns.length === 1);
}

// ── pillar arithmetic ───────────────────────────────────────────────────
{
  const { strategy, dropped } = validateStrategy({
    pillars: [{ key: "a", share: 33 }, { key: "b", share: 33 }, { key: "c", share: 33 }],
    campaigns: [],
  }, ctx);
  const total = strategy.pillars.reduce((n: number, p: { share: number }) => n + p.share, 0);
  check("pillar shares are rescaled to 100", total === 100, `got ${total}`);
  check("the rescale is reported", dropped.some((d) => d.what === "Pillar mix"));
}

// ── calendar hygiene ────────────────────────────────────────────────────
{
  const strategy = { pillars: [{ key: "proof" }, { key: "teach" }], campaigns: [{ key: "real" }] };
  const { calendar, dropped } = validateCalendar({
    slots: [
      { slotId: "s01", channel: "social", pillar: "proof", funnel: "conversion", campaign: "real", platforms: ["instagram"], hour: 11 },
      { slotId: "s02", channel: "social", pillar: "nonsense", funnel: "invented", campaign: "ghost", platforms: ["tiktok"], hour: 99 },
      { slotId: "s03", channel: "blog", pillar: "teach", funnel: "awareness", platforms: ["instagram"], hour: 9 },
    ],
  }, strategy, ctx);

  check("unknown pillar is reassigned, not dropped", calendar.slots.length === 3 && calendar.slots[1].pillar === "proof", JSON.stringify(calendar.slots[1]));
  check("unknown funnel falls back", calendar.slots[1].funnel === "awareness");
  check("unknown campaign becomes null", calendar.slots[1].campaign === null);
  check("unconnected platform is stripped", !calendar.slots[1].platforms.includes("tiktok"), JSON.stringify(calendar.slots[1].platforms));
  check("stripped slot still has somewhere to go", calendar.slots[1].platforms.length > 0);
  check("blog slot carries no platforms", calendar.slots[2].platforms.length === 0);
  check("out-of-range hour is clamped", calendar.slots[1].hour === 23, `got ${calendar.slots[1].hour}`);
  check("reassignments are reported", dropped.length >= 2, JSON.stringify(dropped));
}

// ── dates outside the planning window ───────────────────────────────────
// Regression: the first real run of the engine returned an entire calendar
// dated June 2024. A post dated in the past either fires the moment the owner
// approves it or never fires at all.
{
  const strategy = { pillars: [{ key: "p" }], campaigns: [] };
  const { calendar, dropped } = validateCalendar({
    slots: [
      { slotId: "s01", channel: "social", pillar: "p", funnel: "awareness", platforms: ["instagram"], hour: 10, date: "2024-06-03" },
      { slotId: "s02", channel: "social", pillar: "p", funnel: "awareness", platforms: ["instagram"], hour: 10, date: "2026-09-05" },
      { slotId: "s03", channel: "social", pillar: "p", funnel: "awareness", platforms: ["instagram"], hour: 10, date: "not-a-date" },
      { slotId: "s04", channel: "social", pillar: "p", funnel: "awareness", platforms: ["instagram"], hour: 10, date: "2027-01-01" },
    ],
  }, strategy, ctx, { startsOn: "2026-09-02", days: 14 });

  const inWindow = (d: string) => d >= "2026-09-02" && d <= "2026-09-15";
  check("past date is pulled into the window", inWindow(calendar.slots[0].date), `got ${calendar.slots[0].date}`);
  check("a valid in-window date is left alone", calendar.slots[1].date === "2026-09-05", `got ${calendar.slots[1].date}`);
  check("unparseable date is repaired", inWindow(calendar.slots[2].date), `got ${calendar.slots[2].date}`);
  check("far-future date is pulled back", inWindow(calendar.slots[3].date), `got ${calendar.slots[3].date}`);
  check("redating is reported", dropped.some((d) => d.why.includes("outside the month")), JSON.stringify(dropped));
  check("no slot lost to redating", calendar.slots.length === 4);
}

// ── no window supplied: dates must be left untouched ────────────────────
{
  const strategy = { pillars: [{ key: "p" }], campaigns: [] };
  const { calendar } = validateCalendar({
    slots: [{ slotId: "s01", channel: "social", pillar: "p", funnel: "awareness", platforms: ["instagram"], hour: 10, date: "2024-06-03" }],
  }, strategy, ctx);
  check("without a window, dates are untouched", calendar.slots[0].date === "2024-06-03", `got ${calendar.slots[0].date}`);
}

// ── does the month match its own strategy? ──────────────────────────────
// Regression: a real run gave each pillar its own channel — security→blog,
// features→email, partnerships→social — so social only ever discussed
// partnerships and the 40% security pillar never appeared there at all.
{
  const strategy = { pillars: [{ key: "security", share: 40 }, { key: "features", share: 35 }, { key: "partnerships", share: 25 }], campaigns: [] };
  const slot = (id: string, pillar: string, channel: string) =>
    ({ slotId: id, channel, pillar, funnel: "awareness", platforms: channel === "social" ? ["instagram"] : [], hour: 10, date: "2026-09-03" });
  const { dropped } = validateCalendar({
    slots: [
      slot("s01", "security", "blog"), slot("s02", "features", "email"), slot("s03", "partnerships", "social"),
      slot("s04", "security", "blog"), slot("s05", "features", "email"), slot("s06", "partnerships", "social"),
    ],
  }, strategy, ctx, { startsOn: "2026-09-02", days: 30 });
  check("one-pillar-per-channel is reported", dropped.some((d) => d.what === "Channel spread"), JSON.stringify(dropped));
  check("the siloed pillar is named", dropped.some((d) => d.why.includes("security appears only on blog")), JSON.stringify(dropped));
}

// A month that genuinely honours its mix must NOT be flagged.
{
  const strategy = { pillars: [{ key: "a", share: 50 }, { key: "b", share: 50 }], campaigns: [] };
  const slot = (id: string, pillar: string, channel: string) =>
    ({ slotId: id, channel, pillar, funnel: "awareness", platforms: channel === "social" ? ["instagram"] : [], hour: 10, date: "2026-09-03" });
  const { dropped } = validateCalendar({
    slots: [
      slot("s01", "a", "social"), slot("s02", "b", "social"),
      slot("s03", "a", "blog"), slot("s04", "b", "blog"),
    ],
  }, strategy, ctx, { startsOn: "2026-09-02", days: 30 });
  check("a well-spread, on-target mix is not flagged", !dropped.some((d) => d.what === "The mix" || d.what === "Channel spread"), JSON.stringify(dropped));
}

// ── evidence discipline ─────────────────────────────────────────────────
{
  const { situation, dropped } = validateSituation({
    observations: [
      { observation: "Whitening sells best", evidence: "24 units in 90 days", source: "orders" },
      { observation: "Customers love us", evidence: "", source: "reviews" },
      { observation: "", evidence: "something" },
    ],
  });
  check("evidence-free observation is removed", situation.observations.length === 1, JSON.stringify(situation.observations));
  check("the removal is reported", dropped.length === 2, JSON.stringify(dropped));
}

// ── fabricated offers in the situation stage ────────────────────────────
{
  const { situation, dropped } = validateOffers({
    liveOffers: [{ code: "SUMMER20", what: "20% off" }, { code: "GHOST10", what: "10% off" }],
  }, ctx);
  check("fabricated live offer is removed", situation.liveOffers.length === 1, JSON.stringify(situation.liveOffers));
  check("the real one survives", situation.liveOffers[0].code === "SUMMER20");
  check("the fabrication is reported", dropped.some((d) => d.what.includes("GHOST10")));
}

// ── empty business: no offers at all ────────────────────────────────────
{
  const bare = { ...ctx, offers: [], catalogue: { products: [], services: [] } } as unknown as BusinessContext;
  const { strategy, dropped } = validateStrategy({
    pillars: [{ key: "a", share: 100 }],
    campaigns: [{ key: "x", name: "Sale", anchor: { kind: "promo", ref: "ANYTHING" } }],
  }, bare);
  check("a business with no offers gets no promo campaign", strategy.campaigns.length === 0);
  check("and is told why", dropped.length >= 1);
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
