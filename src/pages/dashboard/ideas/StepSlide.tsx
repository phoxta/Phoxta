import { imageForStage } from "@/lib/ideas/imagery";
import { getStep, stepIndex, TOTAL_STEPS, type IdeaStep } from "@/lib/ideas/steps";

/**
 * A step's output, rendered as a slide.
 *
 * Each step has a known JSON contract (see supabase/functions/idea-run), so each
 * gets a layout shaped to its own data rather than one generic key/value dump:
 * pain points ranked by severity, the market as a TAM/SAM/SOM funnel, pricing as
 * tiers, the report as scored bars and a SWOT quadrant, the plan as a timeline.
 *
 * The design is Phoxta's homepage, not a look invented for this screen: the dark
 * photographic panel with white type over the bg-linear-opacity gradient, big
 * headings at tight tracking, at-about-title/at-about-dec card copy, a hairline
 * rule opening each block, the theme orange used only to point. ideas.css maps
 * each of those back to the section it came from.
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

/**
 * The homepage's hero block, at pane scale.
 *
 * bg-linear-opacity and bg-cover are main.css's own, so the gradient that keeps
 * white type legible over an unvetted photograph is the same one sec-5-home-4
 * uses rather than a second copy of the idea.
 */
function Hero({ step, image }: { step: IdeaStep; image: string }) {
  const spec = getStep(step);
  return (
    <div className="idv-hero bg-linear-opacity bg-cover rounded-5" style={{ backgroundImage: `url(${image})` }}>
      <span className="idv-hero__tag">
        <i />Stage {String(stepIndex(step) + 1).padStart(2, "0")} of {TOTAL_STEPS} · {spec?.group}
      </span>
      <h3 className="idv-hero__title">{spec?.name}</h3>
      <p className="idv-hero__dec">{spec?.description}</p>
    </div>
  );
}

const Head = ({ children }: { children: React.ReactNode }) => (
  <h4 className="idv-head">{children}</h4>
);

/** `children` is anything that goes above the title — a meter, a chip.
 *  `footer` is anything that goes below the body, kept apart so a card with
 *  both does not have to guess the order. */
const Tile = ({ title, body, accent, children, footer }: {
  title: string; body?: string; accent?: boolean;
  children?: React.ReactNode; footer?: React.ReactNode;
}) => (
  <div className={`idv-tile${accent ? " idv-tile--accent" : ""}`}>
    {children}
    <h5 className="idv-tile__title mb-10">{title}</h5>
    {body && <p className="idv-tile__dec mb-0">{body}</p>}
    {footer}
  </div>
);

/**
 * A figure card.
 *
 * The value steps down as it lengthens. "£38" wants to be the biggest thing on
 * the slide; "Grocery inflation has made a £6-a-head cooked meal cheaper than
 * delivery" is a sentence, and set at figure size it stops being readable and
 * starts being shouting. Same component, three sizes, chosen by what it holds.
 */
const Stat = ({ k, n, note, accent }: { k: string; n: string; note?: string; accent?: boolean }) => {
  const size = n.length > 62 ? " idv-stat__n--xs" : n.length > 18 ? " idv-stat__n--sm" : "";
  return (
    <div className={`idv-stat${accent ? " idv-stat--accent" : ""}`}>
      <span className="idv-stat__k">{k}</span>
      <span className={`idv-stat__n${size}`}>{n}</span>
      {note && <p className="idv-tile__dec mb-0 mt-10">{note}</p>}
    </div>
  );
};

/* ── Per-step bodies ─────────────────────────────────────────────────── */

function ProblemSlide({ d, image }: { d: Json; image: string }) {
  const audience = obj(d.audience);
  return (
    <>
      <div className="row g-4 align-items-center mb-40">
        <div className="col-lg-7">
          {str(d.statement) && <p className="idv-statement mb-0">{str(d.statement)}</p>}
        </div>
        <div className="col-lg-5">
          <img className="idv-shot" src={image} alt="" width={600} height={260} loading="lazy" />
        </div>
      </div>

      {(str(audience.who) || str(audience.demographics)) && (
        <div className="row g-4 mb-40">
          <div className="col-12">
            <Stat k="Who has this problem" n={str(audience.who)} accent
                  note={[str(audience.demographics), str(audience.behaviours)].filter(Boolean).join(" · ")} />
          </div>
        </div>
      )}

      {arr(d.painPoints).length > 0 && (
        <div className="mb-40">
          <Head>Pain points</Head>
          <div className="row g-4">
            {arr(d.painPoints).map((p, i) => (
              <div key={i} className="col-md-6">
                <Tile title={str(p.pain)} body={str(p.evidence)} accent={str(p.severity).toLowerCase().startsWith("high")}>
                  <div className="mb-15"><Meter level={str(p.severity)} /></div>
                </Tile>
              </div>
            ))}
          </div>
        </div>
      )}

      {arr(d.currentSolutions).length > 0 && (
        <div className="mb-40">
          <Head>How it is solved today — and where that falls short</Head>
          <div className="row g-4">
            {arr(d.currentSolutions).map((s, i) => (
              <div key={i} className="col-md-6">
                <Tile title={str(s.name)} body={str(s.shortfall)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {str(d.whyNow) && <Stat k="Why now" n={str(d.whyNow)} accent />}
    </>
  );
}

function MarketSlide({ d }: { d: Json }) {
  const tam = obj(d.tam), sam = obj(d.sam), som = obj(d.som);
  return (
    <>
      <div className="row g-4 align-items-center mb-40">
        <div className="col-lg-7">
          <Head>Market size</Head>
          <div className="idv-funnel">
            {[["TAM", tam], ["SAM", sam], ["SOM", som]].map(([label, o]) => (
              <div key={String(label)} className="idv-funnel__row">
                <span className="idv-funnel__k d-block mb-1">{String(label)}</span>
                <span className="idv-funnel__v d-block">{str((o as Json).value)}</span>
                {str((o as Json).basis) && <span className="idv-funnel__b d-block mt-1">{str((o as Json).basis)}</span>}
              </div>
            ))}
          </div>
        </div>
        <div className="col-lg-5">
          <Stat k="Annual growth" n={str(d.cagr) || "—"} note="Compound growth across the total market." />
        </div>
      </div>

      {arr(d.trends).length > 0 && (
        <div className="mb-40">
          <Head>Trends</Head>
          <div className="row g-4">
            {arr(d.trends).map((t, i) => {
              const supports = str(t.impact).toLowerCase().startsWith("support");
              return (
                <div key={i} className="col-md-6">
                  <Tile title={str(t.trend)} body={str(t.note)} accent={!supports}>
                    <span className={`idv-chip idv-chip--${supports ? "emerald" : "amber"} mb-15`}>{str(t.impact)}</span>
                  </Tile>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {arr(d.segments).length > 0 && (
        <div className="mb-40">
          <Head>Segments</Head>
          <div className="row g-4">
            {arr(d.segments).map((sg, i) => (
              <div key={i} className="col-md-4">
                <Stat k={str(sg.name)} n={str(sg.size)} note={`Pays ${str(sg.willingnessToPay)}`} />
              </div>
            ))}
          </div>
        </div>
      )}

      {arr(d.competitors).length > 0 && (
        <div>
          <Head>Who is already there</Head>
          <div className="row g-4">
            {arr(d.competitors).map((c, i) => (
              <div key={i} className="col-md-4">
                <Tile
                  title={str(c.name)}
                  body={str(c.positioning)}
                  footer={str(c.weakness)
                    ? <p className="idv-tile__dec mb-0 mt-10 idv-gap">Gap — {str(c.weakness)}</p>
                    : undefined}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function ValueSlide({ d, image }: { d: Json; image: string }) {
  return (
    <>
      <div className="row g-4 align-items-center mb-40">
        <div className="col-lg-7">
          {str(d.statement) && <p className="idv-statement mb-0">{str(d.statement)}</p>}
        </div>
        <div className="col-lg-5">
          <img className="idv-shot" src={image} alt="" width={600} height={260} loading="lazy" />
        </div>
      </div>

      {arr(d.advantages).length > 0 && (
        <div className="mb-40">
          <Head>Advantages</Head>
          <div className="row g-4">
            {arr(d.advantages).map((a, i) => (
              <div key={i} className="col-md-6">
                <Tile title={str(a.advantage)} body={str(a.why)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {arr(d.positioningAgainst).length > 0 && (
        <div className="mb-40">
          <Head>Against each competitor</Head>
          <div className="row g-4">
            {arr(d.positioningAgainst).map((p, i) => (
              <div key={i} className="col-md-6">
                <Tile title={str(p.competitor)} body={str(p.ourAngle)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {arr(d.differentiators).length > 0 && (
        <div>
          <Head>Hard to copy</Head>
          <div className="row g-4">
            {arr(d.differentiators).map((x, i) => (
              <div key={i} className="col-md-6">
                <Stat k="Moat" n={str(x.differentiator)} note={str(x.moat)} accent={i === 0} />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function CustomerSlide({ d, image }: { d: Json; image: string }) {
  const wtp = obj(d.willingnessToPay);
  return (
    <>
      {arr(d.demandSignals).length > 0 && (
        <div className="mb-40">
          <Head>Demand signals</Head>
          <div className="row g-4 align-items-center">
            <div className="col-lg-7">
              <div className="d-flex flex-column gap-3">
                {arr(d.demandSignals).map((s, i) => (
                  <div key={i} className="idv-tile d-flex align-items-start gap-3">
                    <Meter level={str(s.strength)} scale="strength" />
                    <div style={{ minWidth: 0 }}>
                      <span className="idv-tile__title d-block" style={{ fontSize: 17 }}>{str(s.signal)}</span>
                      <span className="idv-tile__dec">{str(s.source)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-lg-5">
              <img className="idv-shot" src={image} alt="" width={600} height={260} loading="lazy" />
            </div>
          </div>
        </div>
      )}

      {(str(wtp.range) || str(wtp.evidence)) && (
        <div className="mb-40">
          <Stat k="Willingness to pay" n={str(wtp.range)} note={str(wtp.evidence)} accent />
        </div>
      )}

      {arr(d.risks).length > 0 && (
        <div className="mb-40">
          <Head>Risks, and the cheapest way to test each</Head>
          <div className="row g-4">
            {arr(d.risks).map((r, i) => (
              <div key={i} className="col-md-6">
                <Tile title={str(r.risk)} body={`Test — ${str(r.test)}`} />
              </div>
            ))}
          </div>
        </div>
      )}

      {list(d.interviewQuestions).length > 0 && (
        <div>
          <Head>Questions that would disprove this fastest</Head>
          <div className="idv-timeline">
            {list(d.interviewQuestions).map((q, i) => (
              <div key={i} className="idv-timeline__item">
                <p className="idv-dec mb-0">{q}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function ModelSlide({ d }: { d: Json }) {
  const ue = obj(d.unitEconomics), be = obj(d.breakEven);
  const tiers = arr(d.tiers);
  return (
    <>
      {str(d.revenueModel) && <p className="idv-statement mb-40">{str(d.revenueModel)}</p>}

      {tiers.length > 0 && (
        <div className="mb-40">
          <Head>Plans</Head>
          <div className="row g-4">
            {tiers.map((t, i) => (
              <div key={i} className={`col-md-${12 / Math.min(tiers.length, 3)}`}>
                <div className={`idv-tier${i === 1 ? " idv-tier--mid" : ""}`}>
                  <span className="idv-stat__k">{str(t.name)}</span>
                  <span className="idv-tier__price d-block mb-15">{str(t.price)}</span>
                  <p className="idv-tile__dec mb-0">{str(t.includes)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="row g-4 mb-40">
        {([["CAC", ue.cac], ["LTV", ue.ltv], ["LTV : CAC", ue.ltvCacRatio], ["Gross margin", ue.grossMargin]] as [string, unknown][])
          .filter(([, v]) => str(v))
          .map(([k, v]) => (
            <div key={k} className="col-6 col-lg-3"><Stat k={k} n={str(v)} /></div>
          ))}
      </div>

      {(str(be.customers) || str(be.timeline)) && (
        <div className="mb-40">
          <Stat k="Break-even"
                n={`${str(be.customers)}${str(be.timeline) ? ` · ${str(be.timeline)}` : ""}`}
                note={str(be.assumptions)} accent />
        </div>
      )}

      {arr(d.costs).length > 0 && (
        <div>
          <Head>Monthly costs</Head>
          <div className="row g-3">
            {arr(d.costs).map((c, i) => (
              <div key={i} className="col-md-6">
                <div className="idv-tile d-flex align-items-center justify-content-between gap-3" style={{ padding: "18px 22px" }}>
                  <span className="idv-tile__dec mb-0">{str(c.item)}</span>
                  <span className="idv-tile__title mb-0" style={{ fontSize: 18 }}>{str(c.monthly)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
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
      <div className="row g-4 align-items-center mb-40">
        <div className="col-md-4">
          <div className="idv-stat idv-stat--accent">
            <span className="idv-stat__k">Overall</span>
            <span className="idv-stat__n">{overall ?? "—"}<span style={{ fontSize: 20, opacity: 0.5 }}> / 10</span></span>
            <div className="d-flex align-items-center gap-2 mt-15 flex-wrap">
              {verdict && (
                <span className={`idv-chip idv-chip--${verdict === "Pursue" ? "emerald" : verdict === "Reconsider" ? "grey" : "amber"}`}>
                  {verdict}
                </span>
              )}
              {str(d.riskLevel) && <span className="idv-tile__dec mb-0">{str(d.riskLevel)} risk</span>}
            </div>
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

      {str(d.summary) && <p className="idv-dec mb-40">{str(d.summary)}</p>}

      {(swot.strengths.length > 0 || swot.weaknesses.length > 0) && (
        <div className="mb-40">
          <Head>SWOT</Head>
          <div className="idv-swot">
            {([["Strengths", swot.strengths], ["Weaknesses", swot.weaknesses], ["Opportunities", swot.opportunities], ["Threats", swot.threats]] as [string, string[]][]).map(([label, items]) => (
              <div key={label}>
                <span className="idv-stat__k">{label}</span>
                <ul className="mb-0 ps-3">
                  {items.map((it, i) => <li key={i} className="idv-tile__dec mb-1">{it}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {list(d.recommendations).length > 0 && (
        <div>
          <Head>What to do next</Head>
          <div className="idv-timeline">
            {list(d.recommendations).map((r, i) => (
              <div key={i} className="idv-timeline__item">
                <p className="idv-dec mb-0">{r}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function StrategySlide({ d, image }: { d: Json; image: string }) {
  const fin = obj(d.financials);
  const funding = obj(d.fundingNeed);
  return (
    <>
      <div className="row g-4 align-items-center mb-40">
        <div className="col-lg-7">
          {str(d.executiveSummary) && <p className="idv-dec mb-0">{str(d.executiveSummary)}</p>}
        </div>
        <div className="col-lg-5">
          <img className="idv-shot" src={image} alt="" width={600} height={260} loading="lazy" />
        </div>
      </div>

      {arr(d.sections).length > 0 && (
        <div className="mb-40">
          <Head>The plan</Head>
          <div className="row g-4">
            {arr(d.sections).map((s, i) => (
              <div key={i} className="col-md-6">
                <Tile title={str(s.heading)} body={str(s.body)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {arr(fin.projection).length > 0 && (
        <div className="mb-40">
          <Head>Projection</Head>
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr><th>Period</th><th>Revenue</th><th>Costs</th><th>Net</th></tr>
              </thead>
              <tbody>
                {arr(fin.projection).map((p, i) => (
                  <tr key={i}>
                    <td className="idv-tile__dec">{str(p.period)}</td>
                    <td className="fw-700">{str(p.revenue)}</td>
                    <td>{str(p.costs)}</td>
                    <td className="fw-700">{str(p.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {list(fin.assumptions).length > 0 && (
        <div className="mb-40">
          <Head>Assumptions behind those numbers</Head>
          <ul className="ps-3 mb-0">
            {list(fin.assumptions).map((a, i) => <li key={i} className="idv-dec mb-2">{a}</li>)}
          </ul>
        </div>
      )}

      {arr(d.milestones).length > 0 && (
        <div className="mb-40">
          <Head>Milestones</Head>
          <div className="idv-timeline">
            {arr(d.milestones).map((m, i) => (
              <div key={i} className="idv-timeline__item">
                <span className="idv-stat__k">{str(m.when)}</span>
                <p className="idv-tile__title mb-0" style={{ fontSize: 19 }}>{str(m.target)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {str(funding.amount) && <Stat k="Funding needed" n={str(funding.amount)} note={str(funding.use)} accent />}
    </>
  );
}

/* ── Dispatch ────────────────────────────────────────────────────────── */

export default function StepSlide({ step, output, seed }: { step: IdeaStep; output: unknown; seed: string }) {
  const d = obj(output);
  // The stage names its own subject; the idea's words are only the fallback for
  // a run generated before imageQuery existed.
  const query = str(d.imageQuery);
  const hero = imageForStage(query, seed, stepIndex(step), 1200, 560);
  const inline = imageForStage(query, seed, stepIndex(step) + 1, 800, 520);

  const body =
    step === "problem" ? <ProblemSlide d={d} image={inline} />
      : step === "market" ? <MarketSlide d={d} />
        : step === "value" ? <ValueSlide d={d} image={inline} />
          : step === "customer" ? <CustomerSlide d={d} image={inline} />
            : step === "model" ? <ModelSlide d={d} />
              : step === "report" ? <ReportSlide d={d} />
                : <StrategySlide d={d} image={inline} />;

  return (
    <section className="idv-slide">
      <Hero step={step} image={hero} />
      <div className="idv-body">{body}</div>
    </section>
  );
}
