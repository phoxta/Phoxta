import type { Coverage, PlanSection } from "@/lib/db/ops/contentPlan";

/**
 * The month's thinking, before the month exists.
 *
 * THIS SCREEN IS THE PRODUCT. Thirty captions is the easy half; what makes a
 * plan worth approving is being able to read WHY it looks like this and say no
 * before a word is written. So the strategy is shown as a document — a thesis,
 * the evidence under it, the mix, the campaign, and the refusals — and the two
 * buttons at the bottom are "this is right" and "change it".
 *
 * AN OBSERVATION WITH NO EVIDENCE IS NOT DRAWN. The engine already drops those
 * server-side, and this refuses them again rather than trusting that: the whole
 * claim of the feature is that it works from the business's real data, and a
 * confident sentence with nothing under it is exactly what that claim is
 * supposed to rule out. Same discipline as the dossier, which will not render a
 * figure that has no basis.
 */

// deno-lint-ignore-file
type Json = Record<string, unknown>;

const asArray = (v: unknown): Json[] => (Array.isArray(v) ? v as Json[] : []);
const str = (v: unknown) => (typeof v === "string" ? v : "");

const SOURCE_LABEL: Record<string, string> = {
  orders: "your sales",
  conversations: "your inbox",
  reviews: "your reviews",
  bookings: "your bookings",
  catalogue: "your catalogue",
  offers: "your offers",
  segments: "your segments",
  history: "what you posted before",
  dossier: "your playbook",
};

export function PlanStrategy({
  sections, coverage, onApprove, onChange, busy,
}: {
  sections: PlanSection[];
  coverage: Coverage[];
  onApprove: () => void;
  onChange: (steer: string) => void;
  busy: boolean;
}) {
  const of = (k: string): Json => (sections.find((s) => s.section === k)?.content ?? {}) as Json;
  const situation = of("situation");
  const audience = of("audience");
  const strategy = of("strategy");

  const observations = asArray(situation.observations).filter((o) => str(o.evidence).trim() && str(o.observation).trim());
  const language = asArray(situation.customerLanguage);
  const offers = asArray(situation.liveOffers);
  const gaps = Array.isArray(situation.gaps) ? (situation.gaps as string[]) : [];
  const pillars = asArray(strategy.pillars);
  const campaigns = asArray(strategy.campaigns);
  const notDoing = Array.isArray(strategy.notDoing) ? (strategy.notDoing as string[]) : [];
  const audiences = asArray(audience.audiences);
  const measure = (strategy.measure ?? {}) as Json;
  const read = coverage.filter((c) => c.rows > 0);
  const missing = coverage.filter((c) => c.note);

  return (
    <div className="pln-strategy">
      {/* What this was written from. An empty source is a quality hit the owner
          can act on, so it is stated rather than quietly absorbed. */}
      {(read.length > 0 || missing.length > 0) && (
        <div className="pln-coverage">
          {read.length > 0 && (
            <p className="pln-coverage-read">
              Read {read.map((c) => `${c.rows} ${c.source}`).join(", ")}.
            </p>
          )}
          {missing.map((c) => (
            <p key={c.source} className="pln-coverage-gap">{c.note}</p>
          ))}
        </div>
      )}

      {str(strategy.thesis) && (
        <section className="pln-thesis">
          <h4 className="pln-thesis-title">{str(strategy.title) || "This month"}</h4>
          <p className="pln-thesis-body">{str(strategy.thesis)}</p>
          {str(measure.metric) && (
            <p className="pln-measure">
              <strong>How you'll know it worked:</strong> {str(measure.metric)}
              {str(measure.howToCheck) ? ` — ${str(measure.howToCheck)}` : ""}
            </p>
          )}
        </section>
      )}

      {observations.length > 0 && (
        <section className="pln-block">
          <h5 className="pln-block-title">What's actually happening</h5>
          <ul className="pln-obs-list">
            {observations.map((o, i) => (
              <li key={i} className="pln-obs">
                <p className="pln-obs-what">{str(o.observation)}</p>
                <p className="pln-obs-evidence">
                  <span className="pln-obs-chip">{SOURCE_LABEL[str(o.source)] ?? str(o.source) ?? "evidence"}</span>
                  {str(o.evidence)}
                </p>
                {str(o.soWhat) && <p className="pln-obs-so">{str(o.soWhat)}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {language.length > 0 && (
        <section className="pln-block">
          <h5 className="pln-block-title">What your customers actually ask</h5>
          <ul className="pln-lang-list">
            {language.map((q, i) => (
              <li key={i} className="pln-lang">
                <span className="pln-lang-quote">“{str(q.theyAsk)}”</span>
                {str(q.postIdea) && <span className="pln-lang-idea">→ {str(q.postIdea)}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {audiences.length > 0 && (
        <section className="pln-block">
          <h5 className="pln-block-title">Who this is for</h5>
          {audiences.map((a, i) => (
            <div key={i} className="pln-aud">
              <p className="pln-aud-name">
                {str(a.name)}
                {str(audience.primary) === str(a.name) && <span className="pln-aud-primary">leading with this one</span>}
              </p>
              <p className="pln-aud-who">{str(a.who)}</p>
              {str(a.objection) && <p className="pln-aud-obj"><strong>What stops them:</strong> {str(a.objection)}</p>}
            </div>
          ))}
          {str(audience.notFor) && (
            <p className="pln-notfor"><strong>Not written for:</strong> {str(audience.notFor)}</p>
          )}
        </section>
      )}

      {pillars.length > 0 && (
        <section className="pln-block">
          <h5 className="pln-block-title">The mix</h5>
          <div className="pln-pillars">
            {pillars.map((p, i) => (
              <div key={i} className="pln-pillar">
                <div className="pln-pillar-head">
                  <span className="pln-pillar-name">{str(p.name) || str(p.key)}</span>
                  <span className="pln-pillar-share">{Number(p.share) || 0}%</span>
                </div>
                <div className="pln-pillar-bar"><span style={{ width: `${Number(p.share) || 0}%` }} /></div>
                <p className="pln-pillar-why">{str(p.why)}</p>
                {str(p.funnel) && <span className="pln-funnel-chip">{str(p.funnel)}</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {campaigns.length > 0 && (
        <section className="pln-block">
          <h5 className="pln-block-title">Campaigns</h5>
          {campaigns.map((c, i) => {
            const anchor = (c.anchor ?? {}) as Json;
            const window = (c.window ?? {}) as Json;
            return (
              <div key={i} className="pln-campaign">
                <p className="pln-campaign-name">{str(c.name)}</p>
                {/* The anchor is the honest part: it was checked against real
                    promo codes, products and services before this rendered. */}
                {str(anchor.ref) && (
                  <p className="pln-campaign-anchor">
                    Anchored on <strong>{str(anchor.ref)}</strong>
                    {str(window.from) ? ` · ${str(window.from)} to ${str(window.to)}` : ""}
                  </p>
                )}
                {str(anchor.quote) && <p className="pln-campaign-why">{str(anchor.quote)}</p>}
              </div>
            );
          })}
        </section>
      )}

      {offers.length > 0 && (
        <section className="pln-block">
          <h5 className="pln-block-title">Offers this month may mention</h5>
          <ul className="pln-offers">
            {offers.map((o, i) => (
              <li key={i}><code>{str(o.code)}</code> — {str(o.what)}{str(o.expires) ? `, until ${str(o.expires)}` : ""}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Rendered as prominently as the plan itself. A strategy with no refusal
          in it is a wish list, and hiding the refusals would make it one. */}
      {notDoing.length > 0 && (
        <section className="pln-block pln-block--refuse">
          <h5 className="pln-block-title">What this month is deliberately not doing</h5>
          <ul className="pln-refuse-list">
            {notDoing.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </section>
      )}

      {gaps.length > 0 && (
        <section className="pln-block pln-block--gaps">
          <h5 className="pln-block-title">What we couldn't see</h5>
          <ul className="pln-gap-list">{gaps.map((g, i) => <li key={i}>{g}</li>)}</ul>
        </section>
      )}

      <div className="pln-strategy-actions">
        <button type="button" className="pln-btn-primary" onClick={onApprove} disabled={busy}>
          This is right — build the month
        </button>
        <button
          type="button"
          className="pln-btn-ghost"
          disabled={busy}
          onClick={() => {
            const steer = window.prompt("What should change about the strategy?");
            if (steer && steer.trim()) onChange(steer.trim());
          }}
        >
          Change the strategy
        </button>
      </div>
    </div>
  );
}
