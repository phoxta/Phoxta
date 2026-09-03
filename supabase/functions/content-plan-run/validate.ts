// Phoxta — what the model said, checked against what is actually true.
//
// The prompts forbid inventing an offer. Prompts are not a control: the same
// instruction that stops a model nine times out of ten is the one it walks past
// on the tenth, and the tenth is the month that promises "20% off this weekend"
// to a business running no discount. The owner finds out when a customer
// arrives expecting it.
//
// So the rules that MATTER are enforced here, against the real rows:
//
//   - a campaign anchored on a promo code that does not exist is DROPPED
//   - a pillar mix that does not add up is normalised
//   - a slot pointing at a pillar nobody defined is reassigned
//   - an observation with no evidence is removed before it can be rendered
//
// Everything dropped is REPORTED, never silently swallowed — a plan quietly
// missing the campaign it was built around is worse than one that says why.
import type { BusinessContext } from "../_shared/businessContext.ts";

// deno-lint-ignore no-explicit-any
type Json = any;

export type Dropped = { what: string; why: string };

const norm = (s: unknown) => String(s ?? "").trim().toLowerCase();

/**
 * Everything this business can honestly point a campaign at.
 * Codes, product names and service names — nothing else is real.
 */
export function realAnchors(ctx: BusinessContext): Set<string> {
  const out = new Set<string>();
  for (const o of ctx.offers) if (o.code) out.add(norm(o.code));
  for (const p of ctx.catalogue.products) if (p.name) out.add(norm(p.name));
  for (const s of ctx.catalogue.services) if (s.name) out.add(norm(s.name));
  return out;
}

/**
 * A strategy, with everything unfounded removed.
 *
 * Seasons and events are exempt from the anchor check on purpose: "back to
 * school" is a real thing in the world that no table of ours lists, and
 * refusing it would push the model toward anchoring on a fake promo code
 * instead — which is the failure this function exists to prevent.
 */
export function validateStrategy(
  strategy: Json,
  ctx: BusinessContext,
): { strategy: Json; dropped: Dropped[] } {
  const dropped: Dropped[] = [];
  const anchors = realAnchors(ctx);
  const out: Json = { ...(strategy ?? {}) };

  // ── campaigns ──────────────────────────────────────────────────────────
  const campaigns = Array.isArray(out.campaigns) ? out.campaigns : [];
  out.campaigns = campaigns.filter((c: Json) => {
    const kind = norm(c?.anchor?.kind);
    const ref = norm(c?.anchor?.ref);
    if (kind === "season" || kind === "event") return true;
    if (!ref) {
      dropped.push({ what: `Campaign "${c?.name ?? "unnamed"}"`, why: "it was not anchored on anything real" });
      return false;
    }
    if (!anchors.has(ref)) {
      dropped.push({
        what: `Campaign "${c?.name ?? "unnamed"}"`,
        why: `it was built on "${c?.anchor?.ref}", which is not a live offer, product or service in this business`,
      });
      return false;
    }
    // A promo campaign must point at a promo code specifically, not a product.
    if (kind === "promo" && !ctx.offers.some((o) => norm(o.code) === ref)) {
      dropped.push({
        what: `Campaign "${c?.name ?? "unnamed"}"`,
        why: `it was presented as a discount on "${c?.anchor?.ref}", which is not a live promo code`,
      });
      return false;
    }
    return true;
  });

  // ── pillars ────────────────────────────────────────────────────────────
  const pillars = (Array.isArray(out.pillars) ? out.pillars : []).filter((p: Json) => norm(p?.key));
  const total = pillars.reduce((n: number, p: Json) => n + (Number(p?.share) || 0), 0);
  if (pillars.length && Math.abs(total - 100) > 0.5) {
    // Normalised rather than rejected: the mix is a judgement worth keeping
    // even when the arithmetic slipped, and a plan that refuses to exist
    // because 33+33+33 is 99 helps nobody.
    //
    // Largest remainder, not independent rounding. Rounding each share on its
    // own does not add up — 33/33/33 rescales to 33/33/33, which is 99 — and a
    // pillar mix that does not total 100 is exactly the sloppiness this whole
    // validation pass exists to catch.
    const exact = pillars.map((p: Json) => ((Number(p.share) || 0) / (total || 1)) * 100);
    const floors = exact.map((n: number) => Math.floor(n));
    let left = 100 - floors.reduce((a: number, b: number) => a + b, 0);
    const order: { i: number; frac: number }[] = exact
      .map((n: number, i: number) => ({ i, frac: n - Math.floor(n) }));
    order.sort((a, b) => b.frac - a.frac);
    const shares = [...floors];
    for (const { i } of order) {
      if (left <= 0) break;
      shares[i] += 1;
      left--;
    }
    pillars.forEach((p: Json, i: number) => { p.share = shares[i]; });
    dropped.push({ what: "Pillar mix", why: `the shares totalled ${Math.round(total)}%, so they were rescaled to 100%` });
  }
  out.pillars = pillars;

  return { strategy: out, dropped };
}

/**
 * A calendar, with every slot pointed at something that exists.
 *
 * Slots are never dropped — a month missing three posts because the model
 * misspelled a pillar key is a worse outcome than three posts filed under the
 * wrong heading. They are reassigned, and the reassignment is reported.
 */
export function validateCalendar(
  calendar: Json,
  strategy: Json,
  ctx: BusinessContext,
  window?: { startsOn: string; days: number },
): { calendar: Json; dropped: Dropped[] } {
  const dropped: Dropped[] = [];
  const out: Json = { ...(calendar ?? {}) };

  const pillarKeys = new Set(
    (Array.isArray(strategy?.pillars) ? strategy.pillars : []).map((p: Json) => norm(p?.key)).filter(Boolean),
  );
  const campaignKeys = new Set(
    (Array.isArray(strategy?.campaigns) ? strategy.campaigns : []).map((c: Json) => norm(c?.key)).filter(Boolean),
  );
  const connected = new Set(ctx.channels.map((c) => norm(c.platform)));
  const fallbackPillar = [...pillarKeys][0] ?? "";
  const FUNNELS = new Set(["awareness", "consideration", "conversion", "retention"]);

  let reassigned = 0;
  let strippedPlatforms = 0;
  let redated = 0;

  // The planning window, as real dates. A model asked for "YYYY-MM-DD" with no
  // anchor will happily answer with a year it half-remembers from training —
  // the first real run of this came back entirely in June 2024 — and a post
  // dated in the past either fires the instant the owner approves or never
  // fires at all. So the window is enforced here rather than hoped for.
  const startMs = window ? Date.parse(`${window.startsOn}T12:00:00Z`) : NaN;
  const spanDays = Math.max(1, Number(window?.days) || 30);
  const endMs = Number.isNaN(startMs) ? NaN : startMs + (spanDays - 1) * 86400_000;
  const isoOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);

  const slots = (Array.isArray(out.slots) ? out.slots : []).map((s: Json, i: number) => {
    const slot: Json = { ...s };
    slot.slotId = String(slot.slotId ?? `s${String(i + 1).padStart(2, "0")}`);

    const channel = norm(slot.channel);
    slot.channel = channel === "email" || channel === "blog" ? channel : "social";

    if (!pillarKeys.has(norm(slot.pillar))) {
      if (fallbackPillar) reassigned++;
      slot.pillar = fallbackPillar;
    } else {
      slot.pillar = norm(slot.pillar);
    }

    if (!FUNNELS.has(norm(slot.funnel))) slot.funnel = "awareness";
    else slot.funnel = norm(slot.funnel);

    slot.campaign = campaignKeys.has(norm(slot.campaign)) ? norm(slot.campaign) : null;

    // Only channels this business can actually publish to. Planning for a
    // platform they never connected produces a month that half fails on the day.
    if (slot.channel === "social") {
      const asked = Array.isArray(slot.platforms) ? slot.platforms.map(norm) : [];
      const kept = asked.filter((p: string) => connected.has(p));
      if (kept.length !== asked.length) strippedPlatforms++;
      slot.platforms = kept.length ? kept : [...connected];
    } else {
      slot.platforms = [];
    }

    slot.hour = Math.min(23, Math.max(0, Number(slot.hour) || 10));

    // Dates are pulled into the window rather than dropped. Spread evenly by
    // index when a date is unusable, so a model that answers with one wrong
    // year does not collapse the whole month onto a single day.
    if (!Number.isNaN(startMs)) {
      const asked = Date.parse(`${String(slot.date ?? "")}T12:00:00Z`);
      if (Number.isNaN(asked) || asked < startMs || asked > endMs) {
        const step = Math.max(1, Math.floor(spanDays / Math.max(1, (out.slots ?? []).length || 1)));
        slot.date = isoOf(Math.min(endMs, startMs + (i * step) * 86400_000));
        redated++;
      } else {
        slot.date = isoOf(asked);
      }
    }
    return slot;
  });

  if (reassigned) {
    dropped.push({ what: `${reassigned} post(s)`, why: "they named a content pillar the strategy does not have, so they were filed under the first one" });
  }
  if (strippedPlatforms) {
    dropped.push({ what: `${strippedPlatforms} post(s)`, why: "they were aimed at a platform this business has not connected" });
  }
  if (redated) {
    dropped.push({ what: `${redated} post(s)`, why: "they were dated outside the month being planned, so they were moved into it" });
  }

  // Does the month match its own strategy?
  //
  // REPORTED, NOT CORRECTED. Reassigning a slot's pillar would leave an angle
  // about partnerships filed under security — a label that lies rather than a
  // mix that is fixed. So the drift is surfaced and the owner decides whether
  // to rewrite the strategy or accept it.
  const declared = new Map<string, number>();
  for (const p of (Array.isArray(strategy?.pillars) ? strategy.pillars : [])) {
    const k = norm(p?.key);
    if (k) declared.set(k, Number(p?.share) || 0);
  }
  if (declared.size && slots.length) {
    const actual = new Map<string, number>();
    for (const s of slots) actual.set(norm(s.pillar), (actual.get(norm(s.pillar)) ?? 0) + 1);
    const off: string[] = [];
    for (const [key, share] of declared) {
      const got = Math.round(((actual.get(key) ?? 0) / slots.length) * 100);
      if (Math.abs(got - share) > 20) off.push(`${key} planned at ${share}% but got ${got}%`);
    }
    if (off.length) {
      dropped.push({ what: "The mix", why: `it drifted from the strategy — ${off.join("; ")}` });
    }

    // A pillar confined to one channel is invisible to everyone who only sees
    // the others, which is most people.
    const channelsOf = new Map<string, Set<string>>();
    for (const s of slots) {
      const k = norm(s.pillar);
      channelsOf.set(k, (channelsOf.get(k) ?? new Set()).add(String(s.channel)));
    }
    const siloed = [...channelsOf.entries()]
      .filter(([k, ch]) => ch.size === 1 && (actual.get(k) ?? 0) > 1 && declared.has(k))
      .map(([k, ch]) => `${k} appears only on ${[...ch][0]}`);
    if (siloed.length && channelsOf.size > 1) {
      dropped.push({ what: "Channel spread", why: `${siloed.join("; ")} — anyone who follows you elsewhere never sees it` });
    }
  }

  out.slots = slots;
  return { calendar: out, dropped };
}

/**
 * Observations with nothing behind them are removed rather than rendered.
 *
 * The UI could hide them instead, but then the claim still exists in the stored
 * document and the next stage reads it as if it were established. It is cheaper
 * to be honest once, here.
 */
export function validateSituation(situation: Json): { situation: Json; dropped: Dropped[] } {
  const dropped: Dropped[] = [];
  const out: Json = { ...(situation ?? {}) };

  const obs = Array.isArray(out.observations) ? out.observations : [];
  out.observations = obs.filter((o: Json) => {
    const ok = String(o?.evidence ?? "").trim().length > 0 && String(o?.observation ?? "").trim().length > 0;
    if (!ok) dropped.push({ what: `"${String(o?.observation ?? "an observation").slice(0, 60)}"`, why: "it cited no evidence" });
    return ok;
  });

  return { situation: out, dropped };
}

/**
 * Offers the model claimed are live, reduced to the ones that are.
 *
 * This is the same check as the campaign anchor, applied to the situation
 * stage's own list — a fabricated code here would be quoted verbatim into
 * captions three stages later.
 */
export function validateOffers(situation: Json, ctx: BusinessContext): { situation: Json; dropped: Dropped[] } {
  const dropped: Dropped[] = [];
  const out: Json = { ...(situation ?? {}) };
  const real = new Map(ctx.offers.map((o) => [norm(o.code), o]));

  const claimed = Array.isArray(out.liveOffers) ? out.liveOffers : [];
  out.liveOffers = claimed.filter((o: Json) => {
    const hit = real.get(norm(o?.code));
    if (!hit) {
      dropped.push({ what: `Offer "${o?.code ?? "unnamed"}"`, why: "there is no live promo code by that name" });
      return false;
    }
    return true;
  });

  return { situation: out, dropped };
}
