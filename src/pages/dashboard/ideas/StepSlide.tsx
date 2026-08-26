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
 * The design is the Webflow system (VoltAgent/awesome-design-md, MIT): white
 * canvas, near-black #080808 carrying every heading, and a five-stop chromatic
 * accent — purple, pink, blue, orange, green — used only as full-saturation card
 * fills. Each stage head IS one of those category cards, which is the brand's
 * signature surface and happens to be exactly the shape a seven-stage run wants.
 * ideas.css carries the token map and the two places the system was adapted
 * rather than copied.
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
 * flips it. Green, yellow and red are three of the system's own accents, named
 * for exactly this — status, warning, error.
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
 * The stage head, as a category card.
 *
 * A full-saturation accent fill with the display headline in white on top of it.
 * This is the one surface the system lets the chromatic palette own, and putting
 * the stage there means a run reads as a set of categories rather than seven
 * identical white panels. No photograph behind the words: the photo sits on the
 * canvas below, so nothing needs a scrim to stay readable.
 */
function Hero({ step }: { step: IdeaStep }) {
  const spec = getStep(step);
  return (
    <header className="idv-hero">
      <span className="idv-badge idv-badge--onfill mb-20">
        Stage {String(stepIndex(step) + 1).padStart(2, "0")} / {TOTAL_STEPS} · {spec?.group}
      </span>
      <h3 className="idv-display-xl mb-15">{spec?.name}</h3>
      <p className="idv-body-md idv-hero__lede mb-0">{spec?.description}</p>
    </header>
  );
}

const Head = ({ children }: { children: React.ReactNode }) => (
  <h4 className="idv-head">{children}</h4>
);

/** `children` sits above the title — a meter, a pill. `footer` sits below the
 *  body, kept apart so a card with both need not guess the order. */
const Tile = ({ title, body, lift, children, footer }: {
  title: string; body?: string; lift?: boolean;
  children?: React.ReactNode; footer?: React.ReactNode;
}) => (
  <div className={`idv-tile${lift ? " idv-tile--lift" : ""}`}>
    {children}
    <h5 className="idv-title-md mb-10">{title}</h5>
    {body && <p className="idv-body-sm mb-0">{body}</p>}
    {footer}
  </div>
);

/**
 * A figure card.
 *
 * The value is display type at the system's semibold ceiling. It steps down as
 * it lengthens: "£38" wants to be the biggest thing on the slide, and a whole
 * sentence about grocery inflation set at 44px is not a figure, it is shouting.
 */
const Stat = ({ k, n, note, dark, children }: {
  k: string; n: string; note?: string; dark?: boolean; children?: React.ReactNode;
}) => {
  const size = n.length > 62 ? " idv-stat__n--xs" : n.length > 12 ? " idv-stat__n--sm" : "";
  return (
    <div className={`idv-stat${dark ? " idv-stat--dark" : ""}`}>
      <span className="idv-stat__k">{k}</span>
      <span className={`idv-stat__n${size}`}>{n}</span>
      {note && <p className="idv-body-sm mb-0 mt-15">{note}</p>}
      {children}
    </div>
  );
};

/** What idea-run stored for this stage after searching Pexels. */
export type StageImage = {
  url?: string;
  alt?: string;
  photographer?: string;
  photographerUrl?: string;
};

/**
 * The stage photograph.
 *
 * `image` is the real one, searched against the stage's own subject and stored
 * on the idea; `fallback` is the curated set, used when the search has not run
 * or found nothing.
 *
 * The credit is not decoration. Pexels licenses on the condition the
 * photographer is named wherever the photo appears, so it renders from the same
 * object as the URL — a slide cannot show the picture and forget the credit,
 * because there is no path that passes one without the other.
 */
const Shot = ({ image, fallback, tall }: { image: StageImage; fallback: string; tall?: boolean }) => (
  <figure className={`idv-shot-wrap${tall ? " idv-shot-wrap--tall" : ""} mb-0`}>
    <img className={`idv-shot${tall ? " idv-shot--tall" : ""}`}
         src={image.url || fallback} alt={image.alt ?? ""}
         width={720} height={tall ? 340 : 280} loading="lazy" />
    {image.url && image.photographer && (
      <a className="idv-shot__credit" href={image.photographerUrl} target="_blank" rel="noopener noreferrer">
        {image.photographer} / Pexels
      </a>
    )}
  </figure>
);

const Bullets = ({ items }: { items: string[] }) => (
  <ul className="idv-list">{items.map((b, i) => <li key={i}>{b}</li>)}</ul>
);

/* ── Per-step bodies ─────────────────────────────────────────────────── */

function ProblemSlide({ d, image, fallback }: { d: Json; image: StageImage; fallback: string }) {
  const audience = obj(d.audience);
  return (
    <>
      <div className="row g-4 align-items-center mb-40">
        <div className="col-lg-7">
          {str(d.statement) && <p className="idv-display-md mb-0">{str(d.statement)}</p>}
        </div>
        <div className="col-lg-5"><Shot image={image} fallback={fallback} /></div>
      </div>

      {(str(audience.who) || str(audience.demographics)) && (
        <div className="mb-40">
          <Stat k="Who has this problem" n={str(audience.who)} dark
                note={[str(audience.demographics), str(audience.behaviours)].filter(Boolean).join(" · ")} />
        </div>
      )}

      {arr(d.painPoints).length > 0 && (
        <div className="mb-40">
          <Head>Pain points</Head>
          <div className="row g-3">
            {arr(d.painPoints).map((p, i) => (
              <div key={i} className="col-md-6">
                <Tile title={str(p.pain)} body={str(p.evidence)}
                      lift={str(p.severity).toLowerCase().startsWith("high")}>
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
          <div className="row g-3">
            {arr(d.currentSolutions).map((s, i) => (
              <div key={i} className="col-md-6">
                <Tile title={str(s.name)} body={str(s.shortfall)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {str(d.whyNow) && <Stat k="Why now" n={str(d.whyNow)} />}
    </>
  );
}

function MarketSlide({ d, image, fallback }: { d: Json; image: StageImage; fallback: string }) {
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
          <div className="mb-3"><Stat k="Annual growth" n={str(d.cagr) || "—"} /></div>
          <Shot image={image} fallback={fallback} />
        </div>
      </div>

      {arr(d.trends).length > 0 && (
        <div className="mb-40">
          <Head>Trends</Head>
          <div className="row g-3">
            {arr(d.trends).map((t, i) => {
              const supports = str(t.impact).toLowerCase().startsWith("support");
              return (
                <div key={i} className="col-md-6">
                  <Tile title={str(t.trend)} body={str(t.note)}>
                    <span className={`idv-badge idv-badge--${supports ? "good" : "warn"} mb-15`}>{str(t.impact)}</span>
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
          <div className="row g-3">
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
          <div className="row g-3">
            {arr(d.competitors).map((c, i) => (
              <div key={i} className="col-md-4">
                <Tile
                  title={str(c.name)}
                  body={str(c.positioning)}
                  footer={str(c.weakness)
                    ? <p className="idv-caption mb-0 mt-15">Gap — {str(c.weakness)}</p>
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

function ValueSlide({ d, image, fallback }: { d: Json; image: StageImage; fallback: string }) {
  return (
    <>
      <div className="row g-4 align-items-center mb-40">
        <div className="col-lg-7">
          {str(d.statement) && <p className="idv-display-md mb-0">{str(d.statement)}</p>}
        </div>
        <div className="col-lg-5"><Shot image={image} fallback={fallback} /></div>
      </div>

      {arr(d.advantages).length > 0 && (
        <div className="mb-40">
          <Head>Advantages</Head>
          <div className="row g-3">
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
          <div className="row g-3">
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
          <div className="row g-3">
            {arr(d.differentiators).map((x, i) => (
              <div key={i} className="col-md-6">
                <Stat k="Moat" n={str(x.differentiator)} note={str(x.moat)} dark={i === 0} />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function CustomerSlide({ d, image, fallback }: { d: Json; image: StageImage; fallback: string }) {
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
                      <span className="idv-title-sm d-block mb-1">{str(s.signal)}</span>
                      <span className="idv-caption">{str(s.source)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-lg-5"><Shot image={image} fallback={fallback} tall /></div>
          </div>
        </div>
      )}

      {(str(wtp.range) || str(wtp.evidence)) && (
        <div className="mb-40">
          <Stat k="Willingness to pay" n={str(wtp.range)} note={str(wtp.evidence)} dark />
        </div>
      )}

      {arr(d.risks).length > 0 && (
        <div className="mb-40">
          <Head>Risks, and the cheapest way to test each</Head>
          <div className="row g-3">
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
                <p className="idv-body-md mb-0">{q}</p>
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
      {str(d.revenueModel) && <p className="idv-display-md mb-40">{str(d.revenueModel)}</p>}

      {tiers.length > 0 && (
        <div className="mb-40">
          <Head>Plans</Head>
          <div className="row g-3">
            {tiers.map((t, i) => (
              <div key={i} className={`col-md-${12 / Math.min(tiers.length, 3)}`}>
                <div className={`idv-tier${i === 1 ? " idv-tier--featured" : ""}`}>
                  <span className="idv-stat__k">{str(t.name)}</span>
                  <span className="idv-tier__price mb-15">{str(t.price)}</span>
                  <p className="idv-body-sm mb-0">{str(t.includes)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="row g-3 mb-40">
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
                note={str(be.assumptions)} dark />
        </div>
      )}

      {arr(d.costs).length > 0 && (
        <div>
          <Head>Monthly costs</Head>
          <div className="row g-3">
            {arr(d.costs).map((c, i) => (
              <div key={i} className="col-md-6">
                <div className="idv-tile d-flex align-items-center justify-content-between gap-3" style={{ padding: "16px 20px" }}>
                  <span className="idv-body-sm mb-0">{str(c.item)}</span>
                  <span className="idv-title-sm">{str(c.monthly)}</span>
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
          <Stat k="Overall" n={overall === null ? "—" : `${overall} / 10`} dark>
            <div className="d-flex align-items-center gap-2 mt-20 flex-wrap">
              {verdict && (
                <span className={`idv-badge idv-badge--${verdict === "Pursue" ? "good" : verdict === "Reconsider" ? "warn" : "ink"}`}>
                  {verdict}
                </span>
              )}
              {str(d.riskLevel) && <span className="idv-caption">{str(d.riskLevel)} risk</span>}
            </div>
          </Stat>
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

      {str(d.summary) && <p className="idv-body-md mb-40" style={{ maxWidth: "72ch" }}>{str(d.summary)}</p>}

      {(swot.strengths.length > 0 || swot.weaknesses.length > 0) && (
        <div className="mb-40">
          <Head>SWOT</Head>
          <div className="idv-swot">
            {([["Strengths", swot.strengths], ["Weaknesses", swot.weaknesses], ["Opportunities", swot.opportunities], ["Threats", swot.threats]] as [string, string[]][]).map(([label, items]) => (
              <div key={label}>
                <span className="idv-stat__k">{label}</span>
                <Bullets items={items} />
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
                <p className="idv-body-md mb-0">{r}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function StrategySlide({ d, image, fallback }: { d: Json; image: StageImage; fallback: string }) {
  const fin = obj(d.financials);
  const funding = obj(d.fundingNeed);
  return (
    <>
      <div className="row g-4 align-items-center mb-40">
        <div className="col-lg-7">
          {str(d.executiveSummary) && <p className="idv-body-md mb-0">{str(d.executiveSummary)}</p>}
        </div>
        <div className="col-lg-5"><Shot image={image} fallback={fallback} /></div>
      </div>

      {arr(d.sections).length > 0 && (
        <div className="mb-40">
          <Head>The plan</Head>
          <div className="row g-3">
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
                    <td>{str(p.period)}</td>
                    <td className="idv-num">{str(p.revenue)}</td>
                    <td className="idv-num">{str(p.costs)}</td>
                    <td className="idv-num">{str(p.net)}</td>
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
          <Bullets items={list(fin.assumptions)} />
        </div>
      )}

      {arr(d.milestones).length > 0 && (
        <div className="mb-40">
          <Head>Milestones</Head>
          <div className="idv-timeline">
            {arr(d.milestones).map((m, i) => (
              <div key={i} className="idv-timeline__item">
                <span className="idv-stat__k">{str(m.when)}</span>
                <p className="idv-display-sm mb-0">{str(m.target)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {str(funding.amount) && <Stat k="Funding needed" n={str(funding.amount)} note={str(funding.use)} dark />}
    </>
  );
}

/* ── Dispatch ────────────────────────────────────────────────────────── */

/**
 * One category colour per stage.
 *
 * The system maps its five accents onto five product surfaces; here they map
 * onto the run, so no two consecutive stages share a fill and a founder can tell
 * where they are from the colour alone. Seven stages into five accents means two
 * repeats, placed as far apart as the sequence allows.
 */
const CATEGORY: Record<IdeaStep, string> = {
  problem: "purple",
  market: "blue",
  value: "pink",
  customer: "orange",
  model: "green",
  report: "purple",
  strategy: "blue",
};

export default function StepSlide({ step, output, seed }: { step: IdeaStep; output: unknown; seed: string }) {
  const d = obj(output);
  // The real photograph, searched against this stage's own subject by idea-run
  // and stored on the idea. The curated set is the floor beneath it, for stages
  // whose search has not run yet or found nothing; the idea's own words are the
  // last resort, for runs generated before imageQuery existed.
  const image = obj(d.image) as StageImage;
  const fallback = imageForStage(str(d.imageQuery), seed, stepIndex(step), 900, 620);

  const body =
    step === "problem" ? <ProblemSlide d={d} image={image} fallback={fallback} />
      : step === "market" ? <MarketSlide d={d} image={image} fallback={fallback} />
        : step === "value" ? <ValueSlide d={d} image={image} fallback={fallback} />
          : step === "customer" ? <CustomerSlide d={d} image={image} fallback={fallback} />
            : step === "model" ? <ModelSlide d={d} />
              : step === "report" ? <ReportSlide d={d} />
                : <StrategySlide d={d} image={image} fallback={fallback} />;

  return (
    <section className="idv-slide" data-cat={CATEGORY[step]}>
      <Hero step={step} />
      <div className="idv-body">{body}</div>
    </section>
  );
}
