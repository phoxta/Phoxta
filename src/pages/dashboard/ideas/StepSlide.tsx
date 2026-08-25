import { imageForIdea, sectorOf, stockImage } from "@/lib/ideas/imagery";
import { getStep, stepIndex, type IdeaStep } from "@/lib/ideas/steps";

/**
 * A step's output, rendered as a designed slide.
 *
 * Each step has a known JSON contract (see supabase/functions/idea-run), so each
 * gets a layout shaped to its own data rather than one generic key/value dump:
 * pain points ranked by severity, the market as a TAM/SAM/SOM funnel, pricing as
 * tiers, the report as scored bars and a SWOT quadrant, the plan as a timeline.
 *
 * Every slide degrades. The model is asked for a shape but not bound to it, so a
 * missing field renders nothing rather than "undefined" — a slide that is short
 * because the data was thin is honest; one padded with empty scaffolding is not.
 */

type Json = Record<string, unknown>;

const str = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));
const arr = (v: unknown): Json[] => (Array.isArray(v) ? (v as Json[]) : []);
const obj = (v: unknown): Json => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {});
const list = (v: unknown): string[] => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);
const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : parseFloat(str(v));
  return Number.isFinite(n) ? n : null;
};

/**
 * Severity/strength words → a three-bar meter.
 *
 * The two scales run the same way but mean opposite things: three bars of pain
 * is bad news, three bars of demand is good. Sharing one red-at-the-top palette
 * would paint the strongest customer evidence in the alarm colour, so `scale`
 * flips it.
 */
function Meter({ level, scale = "severity" }: { level: string; scale?: "severity" | "strength" }) {
  const l = level.toLowerCase();
  const filled = l.startsWith("high") || l.startsWith("strong") ? 3 : l.startsWith("med") || l.startsWith("mod") ? 2 : 1;
  const tone =
    scale === "strength"
      ? (filled === 3 ? "on-good" : filled === 2 ? "on-med" : "on-weak")
      : (filled === 3 ? "on-high" : filled === 2 ? "on-med" : "on-low");
  return (
    <span className="idv-meter" role="img" aria-label={level || "unrated"}>
      {[0, 1, 2].map((i) => <i key={i} className={i < filled ? tone : ""} />)}
    </span>
  );
}

function Band({ step, seed, variant }: { step: IdeaStep; seed: string; variant: number }) {
  const spec = getStep(step);
  return (
    <div className="idv-slide__band" style={{ backgroundImage: `url(${imageForIdea(seed, variant)})` }}>
      <div className="idv-slide__bandtext">
        <span className="fz-font-label text-uppercase text-white opacity-75 d-block mb-10">
          Step {stepIndex(step) + 1} — {spec?.group}
        </span>
        <h3 className="fz-font-2xl fw-600 text-white lh-1 mb-0">{spec?.name}</h3>
      </div>
    </div>
  );
}

const Head = ({ children }: { children: React.ReactNode }) => (
  <h4 className="fz-font-label text-uppercase neutral-500 mb-15">{children}</h4>
);

/* ── Per-step bodies ─────────────────────────────────────────────────── */

function ProblemSlide({ d }: { d: Json }) {
  const audience = obj(d.audience);
  return (
    <>
      {str(d.statement) && (
        <p className="fz-font-2xl fw-600 neutral-900 lh-1 mb-30">{str(d.statement)}</p>
      )}

      {(str(audience.who) || str(audience.demographics)) && (
        <div className="idv-stat idv-stat--blue mb-30">
          <span className="idv-stat__k">Who has this problem</span>
          <p className="fz-font-lg fw-600 neutral-900 mb-10">{str(audience.who)}</p>
          <p className="fz-font-md neutral-500 mb-0">
            {[str(audience.demographics), str(audience.behaviours)].filter(Boolean).join(" · ")}
          </p>
        </div>
      )}

      {arr(d.painPoints).length > 0 && (
        <>
          <Head>Pain points</Head>
          <div className="row g-3 mb-30">
            {arr(d.painPoints).map((p, i) => (
              <div key={i} className="col-md-6">
                <div className="idv-tile idv-tile--accent">
                  <div className="d-flex align-items-center justify-content-between gap-2 mb-10">
                    <span className="fz-font-md fw-600 neutral-900">{str(p.pain)}</span>
                    <Meter level={str(p.severity)} />
                  </div>
                  <p className="fz-font-md neutral-500 mb-0">{str(p.evidence)}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {arr(d.currentSolutions).length > 0 && (
        <>
          <Head>How it is solved today — and where that falls short</Head>
          <div className="row g-3 mb-30">
            {arr(d.currentSolutions).map((s, i) => (
              <div key={i} className="col-md-6">
                <div className="idv-tile">
                  <span className="fz-font-md fw-600 neutral-900 d-block mb-10">{str(s.name)}</span>
                  <p className="fz-font-md neutral-500 mb-0">{str(s.shortfall)}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {str(d.whyNow) && (
        <div className="idv-stat idv-stat--amber">
          <span className="idv-stat__k">Why now</span>
          <p className="fz-font-lg neutral-900 mb-0">{str(d.whyNow)}</p>
        </div>
      )}
    </>
  );
}

function MarketSlide({ d }: { d: Json }) {
  const tam = obj(d.tam), sam = obj(d.sam), som = obj(d.som);
  return (
    <>
      <div className="row g-3 align-items-center mb-30">
        <div className="col-lg-7">
          <Head>Market size</Head>
          <div className="idv-funnel">
            {[["TAM", tam], ["SAM", sam], ["SOM", som]].map(([label, o]) => (
              <div key={String(label)} className="idv-funnel__row">
                <span className="fz-font-label text-uppercase opacity-75 d-block">{String(label)}</span>
                <span className="fz-font-lg fw-600 d-block">{str((o as Json).value)}</span>
                {str((o as Json).basis) && (
                  <span className="fz-font-label opacity-75 d-block mt-1">{str((o as Json).basis)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="col-lg-5">
          <div className="idv-stat idv-stat--emerald">
            <span className="idv-stat__k">Growth rate</span>
            <span className="idv-stat__n">{str(d.cagr) || "—"}</span>
            <p className="fz-font-md neutral-500 mb-0 mt-10">Compound annual growth across the total market.</p>
          </div>
        </div>
      </div>

      {arr(d.trends).length > 0 && (
        <>
          <Head>Trends</Head>
          <div className="row g-3 mb-30">
            {arr(d.trends).map((t, i) => {
              const supports = str(t.impact).toLowerCase().startsWith("support");
              return (
                <div key={i} className="col-md-6">
                  <div className="idv-tile">
                    <span className={`idv-chip idv-chip--${supports ? "emerald" : "amber"} mb-10`}>{str(t.impact)}</span>
                    <span className="fz-font-md fw-600 neutral-900 d-block mb-10">{str(t.trend)}</span>
                    <p className="fz-font-md neutral-500 mb-0">{str(t.note)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {arr(d.segments).length > 0 && (
        <>
          <Head>Segments</Head>
          <div className="row g-3 mb-30">
            {arr(d.segments).map((sg, i) => (
              <div key={i} className="col-md-4">
                <div className="idv-stat">
                  <span className="idv-stat__k">{str(sg.name)}</span>
                  <p className="fz-font-lg fw-600 neutral-900 mb-1">{str(sg.size)}</p>
                  <p className="fz-font-md neutral-500 mb-0">Pays {str(sg.willingnessToPay)}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {arr(d.competitors).length > 0 && (
        <>
          <Head>Who is already there</Head>
          <div className="row g-3">
            {arr(d.competitors).map((c, i) => (
              <div key={i} className="col-md-4">
                <div className="idv-tile">
                  <span className="fz-font-md fw-600 neutral-900 d-block mb-10">{str(c.name)}</span>
                  <p className="fz-font-md neutral-500 mb-10">{str(c.positioning)}</p>
                  <p className="fz-font-md mb-0" style={{ color: "#b45309" }}>Gap: {str(c.weakness)}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function ValueSlide({ d }: { d: Json }) {
  return (
    <>
      {str(d.statement) && <p className="fz-font-2xl fw-600 neutral-900 lh-1 mb-30">{str(d.statement)}</p>}

      {arr(d.advantages).length > 0 && (
        <>
          <Head>Advantages</Head>
          <div className="row g-3 mb-30">
            {arr(d.advantages).map((a, i) => (
              <div key={i} className="col-md-6">
                <div className="idv-tile idv-tile--accent">
                  <span className="fz-font-md fw-600 neutral-900 d-block mb-10">{str(a.advantage)}</span>
                  <p className="fz-font-md neutral-500 mb-0">{str(a.why)}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {arr(d.positioningAgainst).length > 0 && (
        <>
          <Head>Against each competitor</Head>
          <div className="row g-3 mb-30">
            {arr(d.positioningAgainst).map((p, i) => (
              <div key={i} className="col-md-6">
                <div className="idv-tile">
                  <span className="idv-chip idv-chip--grey mb-10">{str(p.competitor)}</span>
                  <p className="fz-font-md neutral-700 mb-0">{str(p.ourAngle)}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {arr(d.differentiators).length > 0 && (
        <>
          <Head>Hard to copy</Head>
          <div className="row g-3">
            {arr(d.differentiators).map((x, i) => (
              <div key={i} className="col-md-6">
                <div className="idv-stat idv-stat--purple">
                  <span className="fz-font-md fw-600 neutral-900 d-block mb-10">{str(x.differentiator)}</span>
                  <p className="fz-font-md neutral-500 mb-0">{str(x.moat)}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function CustomerSlide({ d }: { d: Json }) {
  const wtp = obj(d.willingnessToPay);
  return (
    <>
      {arr(d.demandSignals).length > 0 && (
        <>
          <Head>Demand signals</Head>
          <div className="d-flex flex-column gap-2 mb-30">
            {arr(d.demandSignals).map((s, i) => (
              <div key={i} className="idv-tile d-flex align-items-start gap-3">
                <Meter level={str(s.strength)} scale="strength" />
                <div style={{ minWidth: 0 }}>
                  <span className="fz-font-md fw-600 neutral-900 d-block">{str(s.signal)}</span>
                  <span className="fz-font-label neutral-500">{str(s.source)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {(str(wtp.range) || str(wtp.evidence)) && (
        <div className="idv-stat idv-stat--emerald mb-30">
          <span className="idv-stat__k">Willingness to pay</span>
          <span className="idv-stat__n">{str(wtp.range)}</span>
          <p className="fz-font-md neutral-500 mb-0 mt-10">{str(wtp.evidence)}</p>
        </div>
      )}

      {arr(d.risks).length > 0 && (
        <>
          <Head>Risks, and the cheapest way to test each</Head>
          <div className="row g-3 mb-30">
            {arr(d.risks).map((r, i) => (
              <div key={i} className="col-md-6">
                <div className="idv-tile">
                  <span className="fz-font-md fw-600 neutral-900 d-block mb-10">{str(r.risk)}</span>
                  <p className="fz-font-md neutral-500 mb-0">Test: {str(r.test)}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {list(d.interviewQuestions).length > 0 && (
        <>
          <Head>Questions that would disprove this fastest</Head>
          <div className="idv-timeline">
            {list(d.interviewQuestions).map((q, i) => (
              <div key={i} className="idv-timeline__item">
                <p className="fz-font-md neutral-700 mb-0">{q}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function ModelSlide({ d }: { d: Json }) {
  const ue = obj(d.unitEconomics), be = obj(d.breakEven);
  const tiers = arr(d.tiers);
  return (
    <>
      {str(d.revenueModel) && <p className="fz-font-lg neutral-900 mb-30">{str(d.revenueModel)}</p>}

      {tiers.length > 0 && (
        <div className="row g-3 mb-30">
          {tiers.map((t, i) => (
            <div key={i} className={`col-md-${12 / Math.min(tiers.length, 3)}`}>
              <div className={`idv-tier${i === 1 ? " idv-tier--mid" : ""}`}>
                <span className="fz-font-label text-uppercase neutral-500 d-block mb-10">{str(t.name)}</span>
                <span className="idv-tier__price d-block mb-10">{str(t.price)}</span>
                <p className="fz-font-md neutral-500 mb-0">{str(t.includes)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="row g-3 mb-30">
        {[["CAC", ue.cac, "blue"], ["LTV", ue.ltv, "emerald"], ["LTV:CAC", ue.ltvCacRatio, "purple"], ["Gross margin", ue.grossMargin, "amber"]]
          .filter(([, v]) => str(v))
          .map(([k, v, tone]) => (
            <div key={String(k)} className="col-6 col-lg-3">
              <div className={`idv-stat idv-stat--${String(tone)}`}>
                <span className="idv-stat__k">{String(k)}</span>
                <span className="idv-stat__n">{str(v)}</span>
              </div>
            </div>
          ))}
      </div>

      {(str(be.customers) || str(be.timeline)) && (
        <div className="idv-stat mb-30">
          <span className="idv-stat__k">Break-even</span>
          <p className="fz-font-lg fw-600 neutral-900 mb-10">
            {str(be.customers)}{str(be.timeline) ? ` · ${str(be.timeline)}` : ""}
          </p>
          <p className="fz-font-md neutral-500 mb-0">{str(be.assumptions)}</p>
        </div>
      )}

      {arr(d.costs).length > 0 && (
        <>
          <Head>Monthly costs</Head>
          <div className="row g-2">
            {arr(d.costs).map((c, i) => (
              <div key={i} className="col-md-6">
                <div className="d-flex align-items-center justify-content-between idv-tile py-2">
                  <span className="fz-font-md neutral-700">{str(c.item)}</span>
                  <span className="fz-font-md fw-600 neutral-900">{str(c.monthly)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

const SCORE_KEYS: [string, string][] = [
  ["marketScore", "Market"],
  ["productScore", "Product"],
  ["competitivePosition", "Competitive position"],
  ["customerDemand", "Customer demand"],
  ["financialViability", "Financial viability"],
];

function ReportSlide({ d }: { d: Json }) {
  // The prompt asks for both a swot object and top-level strengths/weaknesses.
  // Either can come back empty, so each quadrant falls back to the other source
  // rather than rendering an empty box next to a populated one.
  const raw = obj(d.swot);
  const swot = {
    strengths: list(raw.strengths).length ? list(raw.strengths) : list(d.strengths),
    weaknesses: list(raw.weaknesses).length ? list(raw.weaknesses) : list(d.weaknesses),
    opportunities: list(raw.opportunities),
    threats: list(raw.threats),
  };
  const overall = num(d.overallScore);
  const verdict = str(d.verdict);
  return (
    <>
      <div className="row g-3 align-items-center mb-30">
        <div className="col-md-4">
          <div className="idv-stat idv-stat--blue text-center">
            <span className="idv-stat__k">Overall</span>
            <span className="idv-stat__n">{overall ?? "—"}<span className="fz-font-md neutral-500"> / 10</span></span>
            {verdict && <span className={`idv-chip idv-chip--${verdict === "Pursue" ? "emerald" : verdict === "Reconsider" ? "grey" : "amber"} mt-10`}>{verdict}</span>}
            {str(d.riskLevel) && <span className="fz-font-label neutral-500 d-block mt-10">{str(d.riskLevel)} risk</span>}
          </div>
        </div>
        <div className="col-md-8">
          {SCORE_KEYS.filter(([k]) => num(d[k]) !== null).map(([k, label]) => {
            const v = num(d[k]) ?? 0;
            return (
              <div key={k} className="idv-score">
                <span className="idv-score__k">{label}</span>
                <span className="idv-score__track"><span className="idv-score__fill" style={{ width: `${v * 10}%` }} /></span>
                <span className="idv-score__n">{v}</span>
              </div>
            );
          })}
        </div>
      </div>

      {str(d.summary) && <p className="fz-font-lg neutral-700 mb-30">{str(d.summary)}</p>}

      {(swot.strengths.length > 0 || swot.weaknesses.length > 0) && (
        <>
          <Head>SWOT</Head>
          <div className="idv-swot mb-30">
            {[["Strengths", swot.strengths], ["Weaknesses", swot.weaknesses], ["Opportunities", swot.opportunities], ["Threats", swot.threats]].map(([label, items]) => (
              <div key={String(label)}>
                <span className="fz-font-label text-uppercase neutral-500 d-block mb-10">{String(label)}</span>
                <ul className="mb-0 ps-3">
                  {(Array.isArray(items) ? items : []).map((it, i) => (
                    <li key={i} className="fz-font-md neutral-700 mb-1">{str(it)}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}

      {arr(d.recommendations).length > 0 && (
        <>
          <Head>What to do next</Head>
          <div className="idv-timeline">
            {(d.recommendations as unknown[]).map((r, i) => (
              <div key={i} className="idv-timeline__item">
                <p className="fz-font-md neutral-700 mb-0">{str(r)}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function StrategySlide({ d }: { d: Json }) {
  const fin = obj(d.financials);
  const funding = obj(d.fundingNeed);
  return (
    <>
      {str(d.executiveSummary) && <p className="fz-font-lg neutral-700 mb-30">{str(d.executiveSummary)}</p>}

      {arr(d.sections).length > 0 && (
        <div className="row g-3 mb-30">
          {arr(d.sections).map((s, i) => (
            <div key={i} className="col-md-6">
              <div className="idv-tile">
                <span className="fz-font-md fw-600 neutral-900 d-block mb-10">{str(s.heading)}</span>
                <p className="fz-font-md neutral-500 mb-0">{str(s.body)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {arr(fin.projection).length > 0 && (
        <>
          <Head>Projection</Head>
          <div className="table-responsive mb-30">
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr className="fz-font-label text-uppercase neutral-500">
                  <th>Period</th><th>Revenue</th><th>Costs</th><th>Net</th>
                </tr>
              </thead>
              <tbody>
                {arr(fin.projection).map((p, i) => (
                  <tr key={i} className="fz-font-md">
                    <td className="neutral-500">{str(p.period)}</td>
                    <td className="fw-600 neutral-900">{str(p.revenue)}</td>
                    <td className="neutral-700">{str(p.costs)}</td>
                    <td className="fw-600 neutral-900">{str(p.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {list(fin.assumptions).length > 0 && (
        <>
          <Head>Assumptions behind those numbers</Head>
          <ul className="mb-30 ps-3">
            {list(fin.assumptions).map((a, i) => (
              <li key={i} className="fz-font-md neutral-700 mb-1">{a}</li>
            ))}
          </ul>
        </>
      )}

      {arr(d.milestones).length > 0 && (
        <>
          <Head>Milestones</Head>
          <div className="idv-timeline mb-30">
            {arr(d.milestones).map((m, i) => (
              <div key={i} className="idv-timeline__item">
                <span className="fz-font-label text-uppercase neutral-500 d-block">{str(m.when)}</span>
                <p className="fz-font-md neutral-900 mb-0">{str(m.target)}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {str(funding.amount) && (
        <div className="idv-stat idv-stat--emerald">
          <span className="idv-stat__k">Funding needed</span>
          <span className="idv-stat__n">{str(funding.amount)}</span>
          <p className="fz-font-md neutral-500 mb-0 mt-10">{str(funding.use)}</p>
        </div>
      )}
    </>
  );
}

function WebsiteSlide({ d, seed }: { d: Json; seed: string }) {
  const hero = obj(d.hero);
  const palette = obj(d.palette);
  const sector = sectorOf(str(d.templateHint), seed);
  return (
    <>
      <div className="row g-3 align-items-center mb-30">
        <div className="col-lg-7">
          <span className="fz-font-label text-uppercase neutral-500 d-block mb-10">{str(d.brandName)}</span>
          <h3 className="fz-font-2xl fw-600 neutral-900 lh-1 mb-10">{str(hero.headline) || str(d.tagline)}</h3>
          <p className="fz-font-md neutral-500 mb-0">{str(hero.subhead)}</p>
        </div>
        <div className="col-lg-5">
          <img src={stockImage(sector, 1, 600, 400)} alt={`${str(d.brandName)} preview`}
               width={600} height={400} loading="lazy" className="img-cover w-100 rounded-3" />
        </div>
      </div>

      {(str(palette.primary) || str(palette.accent)) && (
        <>
          <Head>Palette</Head>
          <div className="d-flex align-items-center gap-3 mb-30">
            {["primary", "accent", "ink"].map((k) => str(palette[k]) && (
              <div key={k} className="text-center">
                <span className="idv-swatch d-block mb-1" style={{ background: str(palette[k]) }} />
                <span className="fz-font-label neutral-500">{str(palette[k])}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {arr(d.features).length > 0 && (
        <div className="row g-3 mb-30">
          {arr(d.features).map((f, i) => (
            <div key={i} className="col-md-4">
              <div className="idv-tile">
                <span className="fz-font-md fw-600 neutral-900 d-block mb-10">{str(f.title)}</span>
                <p className="fz-font-md neutral-500 mb-0">{str(f.body)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {arr(d.sections).length > 0 && (
        <>
          <Head>Page sections</Head>
          <div className="row g-3 mb-30">
            {arr(d.sections).map((sec, i) => (
              <div key={i} className="col-md-6">
                <div className="idv-tile idv-tile--accent">
                  <span className="fz-font-md fw-600 neutral-900 d-block mb-10">{str(sec.heading)}</span>
                  <p className="fz-font-md neutral-500 mb-0">{str(sec.body)}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {arr(d.faqs).length > 0 && (
        <>
          <Head>FAQs</Head>
          <div className="d-flex flex-column gap-2">
            {arr(d.faqs).map((f, i) => (
              <div key={i} className="idv-tile">
                <span className="fz-font-md fw-600 neutral-900 d-block mb-1">{str(f.q)}</span>
                <p className="fz-font-md neutral-500 mb-0">{str(f.a)}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

/* ── Dispatch ────────────────────────────────────────────────────────── */

export default function StepSlide({ step, output, seed }: { step: IdeaStep; output: unknown; seed: string }) {
  const d = obj(output);
  const variant = stepIndex(step);

  const body =
    step === "problem" ? <ProblemSlide d={d} />
      : step === "market" ? <MarketSlide d={d} />
        : step === "value" ? <ValueSlide d={d} />
          : step === "customer" ? <CustomerSlide d={d} />
            : step === "model" ? <ModelSlide d={d} />
              : step === "report" ? <ReportSlide d={d} />
                : step === "strategy" ? <StrategySlide d={d} />
                  : <WebsiteSlide d={d} seed={seed} />;

  return (
    <div className="idv-slide">
      <Band step={step} seed={seed} variant={variant} />
      <div className="idv-slide__body">{body}</div>
    </div>
  );
}
