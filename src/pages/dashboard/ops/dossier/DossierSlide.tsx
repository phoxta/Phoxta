import type { ReactNode } from "react";
import { arr, list, obj, str } from "@/lib/safeJson";
import type { Json } from "@/lib/safeJson";
import { StageShot as Shot, type StageImage } from "@/components/StageShot";
import { imageForStage } from "@/lib/ideas/imagery";
import { CONFIDENCE_LABEL, readEstimate, readEstimates, type Estimate } from "@/lib/dossier/estimate";
import { legalPack } from "@/lib/dossier/legal";
import {
  ESTIMATE_NOTICE, ESTIMATE_NOTICE_LEAD, getSection, sectionIndex, TAB_KEYS, type DossierTab,
} from "@/lib/dossier/sections";

/**
 * One section of a business dossier, rendered as a slide.
 *
 * Each section has a known JSON contract (see supabase/functions/dossier-run/
 * sections.ts), so each gets a layout shaped to its own data rather than one
 * generic key/value dump: the market as a narrowing funnel, the launch as a
 * ninety-day timeline, pricing as tiers, the risk register as paired meters.
 *
 * THE FIGURE RULE, WHICH IS THE POINT OF THE WHOLE FILE
 *
 * No number renders on its own. Every quantity arrives as an estimate — a
 * range, the sentence it was derived from, and the assumptions behind it — and
 * <Figure> renders NOTHING when the reasoning is missing. That is deliberately
 * a property of this component rather than a promise about the prompts: a model
 * that ignores the instruction and returns a bare confident figure gets its
 * figure dropped, not printed. The standing disclosure sits in the section head
 * where the reader is looking, not in a footer.
 *
 * The visual system is the one the Idea Validator's slides use — white canvas,
 * near-black #080808 on every heading, five chromatic accents used only as
 * full-saturation card fills, each section head being one of those cards.
 * dossier.css carries the tokens and explains why it is a copy rather than an
 * import.
 *
 * Every slide degrades. The model is asked for a shape but not bound to it, so
 * a missing field renders nothing rather than "undefined" — a section that is
 * short because the data was thin is honest; one padded with empty scaffolding
 * is not.
 */

/* ── Primitives ───────────────────────────────────────────────────────── */

const Head = ({ children }: { children: ReactNode }) => <h4 className="bdx-head">{children}</h4>;

const Bullets = ({ items }: { items: string[] }) => (
  <ul className="bdx-list">{items.map((b, i) => <li key={i}>{b}</li>)}</ul>
);

const Numbered = ({ items }: { items: ReactNode[] }) => (
  <ol className="bdx-list">{items.map((b, i) => <li key={i}>{b}</li>)}</ol>
);

/** `children` sits above the title — a badge, a meter. `footer` sits below the
 *  body, kept apart so a card with both need not guess the order. */
const Tile = ({ title, body, lift, children, footer }: {
  title: string; body?: string; lift?: boolean; children?: ReactNode; footer?: ReactNode;
}) => (
  <div className={`bdx-tile${lift ? " bdx-tile--lift" : ""}`}>
    {children}
    {title && <h5 className="bdx-title-md mb-10">{title}</h5>}
    {body && <p className="bdx-body-sm mb-0">{body}</p>}
    {footer}
  </div>
);

/**
 * A card for something that is NOT a measurement — a name, a target, a verdict.
 *
 * It looks different from <Figure> on purpose. A reader has to be able to tell
 * at a glance which things on a slide are estimates carrying assumptions and
 * which are simply statements, and the fastest way to fail at that is to give
 * both the same card.
 */
const Stat = ({ k, n, note, dark, children }: {
  k: string; n: string; note?: string; dark?: boolean; children?: ReactNode;
}) => {
  const size = n.length > 62 ? " bdx-stat__n--xs" : n.length > 14 ? " bdx-stat__n--sm" : "";
  return (
    <div className={`bdx-stat${dark ? " bdx-stat--dark" : ""}`}>
      {k && <span className="bdx-stat__k">{k}</span>}
      <span className={`bdx-stat__n${size}`}>{n}</span>
      {note && <p className="bdx-body-sm mb-0 mt-15">{note}</p>}
      {children}
    </div>
  );
};

/**
 * A figure, with everything a reader needs to disagree with it.
 *
 * Returns null for a null estimate, which is what makes the honesty rule
 * structural: `readEstimate` refuses anything without a basis or without a
 * range, and every call site here passes its result straight in. There is no
 * path through this file that puts a naked number on a slide.
 *
 * The type steps down as the range lengthens. "£38 – £52" wants to be the
 * biggest thing in the card; a two-line range set at 34px is not a figure.
 */
function Figure({ e, dark, bare, head, foot }: {
  e: Estimate | null;
  dark?: boolean;
  /** Inside a tier or a tile that already has a border — drop the card chrome. */
  bare?: boolean;
  head?: ReactNode;
  foot?: ReactNode;
}) {
  if (!e) return null;
  const size = e.value.length > 40 ? " bdx-fig__n--xs" : e.value.length > 16 ? " bdx-fig__n--sm" : "";
  return (
    <div className={`bdx-fig${dark ? " bdx-fig--dark" : ""}${bare ? " bdx-fig--bare" : ""}`}>
      {head}
      {e.label && <span className="bdx-fig__k">{e.label}</span>}
      <span className={`bdx-fig__n${size}`}>{e.value}</span>
      {e.unit && <span className="bdx-fig__unit">{e.unit}</span>}
      <p className="bdx-fig__basis">{e.basis}</p>
      {e.assumptions.length > 0 && (
        <ul className="bdx-list bdx-fig__ass">
          {e.assumptions.map((a, i) => <li key={i}>{a}</li>)}
        </ul>
      )}
      <div className="bdx-fig__meta">
        <span className="bdx-fig__conf" data-c={e.confidence || undefined}>
          {e.confidence ? CONFIDENCE_LABEL[e.confidence] : "Estimate"}
        </span>
        <span className="bdx-caption">
          {e.assumptions.length > 0 ? "Worked out from the assumptions above" : "Estimated, not measured"}
        </span>
      </div>
      {/* The seam. Empty today, because nothing can fill it honestly yet — a
          later research pass pushes citations into the same stored array and
          they appear here with no other change. */}
      {e.sources.length > 0 && (
        <ul className="bdx-fig__srcs">
          {e.sources.map((s, i) => (
            <li key={i}>
              {s.url
                ? <a href={s.url} target="_blank" rel="noopener noreferrer">{s.title || s.url}</a>
                : s.title}
              {s.publisher && ` — ${s.publisher}`}
            </li>
          ))}
        </ul>
      )}
      {foot}
    </div>
  );
}

/**
 * Low / medium / high as three bars.
 *
 * `scale` flips the palette because the two readings mean opposite things:
 * three bars of risk is bad news and three bars of demand is good. Sharing one
 * red-at-the-top palette would paint the strongest opportunity in the alarm
 * colour.
 */
function Meter({ level, label, scale = "severity" }: {
  level: string; label?: string; scale?: "severity" | "strength";
}) {
  const l = level.toLowerCase();
  const filled = l.startsWith("high") || l.startsWith("strong") ? 3 : l.startsWith("med") || l.startsWith("mod") ? 2 : 1;
  const tone = scale === "strength"
    ? (filled === 3 ? "on-good" : filled === 2 ? "on-med" : "on-weak")
    : (filled === 3 ? "on-high" : filled === 2 ? "on-med" : "on-low");
  return (
    <span className="bdx-meter__row">
      {label && <span>{label}</span>}
      <span className="bdx-meter" role="img" aria-label={`${label ? `${label}: ` : ""}${level || "unrated"}`}>
        {[0, 1, 2].map((i) => <i key={i} className={i < filled ? tone : ""} />)}
      </span>
    </span>
  );
}

/**
 * The section head, as a category card — and where the disclosure lives.
 *
 * Full-saturation accent fill with the display headline on it. The estimate
 * notice sits here, above the first number rather than under the last one,
 * because a warning printed in a footer is a warning nobody reads. It repeats
 * on every generated section: people link to, print and read a single section,
 * and a caveat that only exists on the page above does not travel with it.
 */
function Hero({ section, mine }: { section: DossierTab; mine: boolean }) {
  const spec = getSection(section);
  return (
    <header className="bdx-hero">
      {/* BOTH STATES ARE MARKED, not just one. Only "Your version" was labelled,
          which made the shared dossier the unmarked default — and the shared one
          is the state that needs saying, because every slide addresses the reader
          as "you" while describing a trade in general. The page banner said so,
          but it does not travel: a reader is two scrolls past it within seconds,
          and people link to and print single sections. This rides with the
          section it qualifies. */}
      <span className="bdx-badge bdx-badge--onfill mb-20">
        {String(sectionIndex(section) + 1).padStart(2, "0")} / {TAB_KEYS.length} · {spec?.group}
        {spec?.generated ? (mine ? " · Your version" : " · The general picture for this trade") : ""}
      </span>
      <h3 className="bdx-display-xl mb-15">{spec?.name}</h3>
      <p className="bdx-body-md bdx-hero__lede mb-0">{spec?.description}</p>
      {/* The legal note below used to claim "Written by people, not by AI", and
          that was FALSE. The checklist is a fixed, hand-maintained list rather
          than model output per page load — a real and useful difference — but the
          file was drafted in an AI-assisted session and has not been reviewed by a
          solicitor. Saying otherwise invited exactly the reliance this section
          must not invite: a buyer skipping their own check BECAUSE the page
          promised human authorship. Every claim here is now one we can stand
          behind, and the source link is what makes each item verifiable. */}
      {spec?.generated ? (
        <p className="bdx-note mb-0"><b>{ESTIMATE_NOTICE_LEAD}</b> {ESTIMATE_NOTICE}</p>
      ) : (
        <p className="bdx-note mb-0">
          <b>A checklist, not legal advice.</b> This is a fixed list of what UK law asks of your trade —
          the same for everyone in it, not written per business — and every item links to the official
          source so you can check it yourself. It has not been reviewed by a solicitor, so treat it as a
          starting point for your own advice rather than a substitute for it. We deliberately do not
          generate your terms, privacy notice or refunds policy — see the last group for why, and where
          to get them properly.
        </p>
      )}
    </header>
  );
}

/* ── Sections ─────────────────────────────────────────────────────────── */

type Body = { d: Json; image: StageImage; fallback: string };

function IndustrySlide({ d, image, fallback }: Body) {
  const sizing = readEstimates(d.sizing);
  const growth = readEstimate(d.growth);
  return (
    <>
      <div className="row g-4 align-items-center mb-40">
        <div className="col-lg-7">
          {str(d.headline) && <p className="bdx-display-md mb-15">{str(d.headline)}</p>}
          {str(d.structure) && <p className="bdx-body-md mb-0" style={{ maxWidth: "62ch" }}>{str(d.structure)}</p>}
        </div>
        <div className="col-lg-5"><Shot prefix="bdx" image={image} fallback={fallback} /></div>
      </div>

      {(sizing.length > 0 || growth) && (
        <div className="mb-40">
          <Head>How big it is, and how we got there</Head>
          <div className="row g-4">
            {sizing.length > 0 && (
              <div className="col-lg-8">
                <div className="bdx-funnel">
                  {sizing.slice(0, 3).map((e, i) => (
                    <div key={i} className="bdx-funnel__row">
                      <span className="bdx-funnel__k d-block mb-1">{e.label || `Level ${i + 1}`}</span>
                      <span className="bdx-funnel__v d-block">{e.value}{e.unit ? ` ${e.unit}` : ""}</span>
                      <span className="bdx-funnel__b d-block mt-1">{e.basis}</span>
                      {e.assumptions.length > 0 && (
                        <span className="bdx-funnel__a d-block mt-1">
                          Assuming: {e.assumptions.join(" · ")}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {growth && <div className="col-lg-4"><Figure e={growth} dark /></div>}
          </div>
        </div>
      )}

      {arr(d.demandDrivers).length > 0 && (
        <div className="mb-40">
          <Head>What is moving the market</Head>
          <div className="row g-3">
            {arr(d.demandDrivers).map((t, i) => {
              const tail = str(t.direction).toLowerCase().startsWith("tail");
              return (
                <div key={i} className="col-md-6">
                  <Tile title={str(t.driver)} body={str(t.why)}>
                    <span className={`bdx-badge bdx-badge--${tail ? "good" : "warn"} mb-15`}>
                      {str(t.direction) || (tail ? "Tailwind" : "Headwind")}
                    </span>
                  </Tile>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {arr(d.segments).length > 0 && (
        <div className="mb-40">
          <Head>Who is actually buying</Head>
          <div className="row g-3">
            {arr(d.segments).map((sg, i) => {
              const spend = readEstimate(sg.spend);
              const name = str(sg.name);
              const who = str(sg.who);
              return (
                <div key={i} className="col-md-4">
                  {spend
                    ? <Figure e={{ ...spend, label: name || spend.label }}
                              foot={who ? <p className="bdx-body-sm mb-0 mt-15">{who}</p> : undefined} />
                    : <Tile title={name} body={who} />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {arr(d.seasonality).length > 0 && (
        <div>
          <Head>Through a trading year</Head>
          <div className="bdx-timeline">
            {arr(d.seasonality).map((s, i) => (
              <div key={i} className="bdx-timeline__item">
                <span className="bdx-stat__k">{str(s.period)}</span>
                <p className="bdx-body-md mb-0">{str(s.note)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function CompetitionSlide({ d, image, fallback }: Body) {
  return (
    <>
      <div className="row g-4 align-items-center mb-40">
        <div className="col-lg-7">
          {str(d.headline) && <p className="bdx-display-md mb-15">{str(d.headline)}</p>}
          {str(d.landscape) && <p className="bdx-body-md mb-0" style={{ maxWidth: "62ch" }}>{str(d.landscape)}</p>}
        </div>
        <div className="col-lg-5"><Shot prefix="bdx" image={image} fallback={fallback} /></div>
      </div>

      {arr(d.players).length > 0 && (
        <div className="mb-40">
          <Head>Who is already there</Head>
          <div className="row g-3">
            {arr(d.players).map((p, i) => (
              <div key={i} className="col-md-6">
                <Tile
                  title={str(p.name)}
                  body={str(p.positioning)}
                  footer={
                    <>
                      {str(p.strength) && <p className="bdx-caption mb-0 mt-15">Good at — {str(p.strength)}</p>}
                      {str(p.weakness) && <p className="bdx-caption mb-0 mt-1">Weak at — {str(p.weakness)}</p>}
                    </>
                  }
                >
                  {str(p.kind) && <span className="bdx-badge bdx-badge--soft mb-15">{str(p.kind)}</span>}
                </Tile>
              </div>
            ))}
          </div>
        </div>
      )}

      {arr(d.whiteSpace).length > 0 && (
        <div className="mb-40">
          <Head>Where the room is</Head>
          <div className="row g-3">
            {arr(d.whiteSpace).map((w, i) => (
              <div key={i} className="col-md-6">
                <Stat k="Gap" n={str(w.gap)} dark={i === 0}
                      note={[str(w.whyItExists), str(w.howToTake)].filter(Boolean).join(" — ")} />
              </div>
            ))}
          </div>
        </div>
      )}

      {arr(d.barriers).length > 0 && (
        <div>
          <Head>How hard it is to get in</Head>
          <div className="row g-3">
            {arr(d.barriers).map((b, i) => (
              <div key={i} className="col-md-6">
                <Tile title={str(b.barrier)} body={str(b.note)}>
                  <div className="mb-15"><Meter level={str(b.height)} label="Height" /></div>
                </Tile>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function StrategySlide({ d, image, fallback }: Body) {
  const pos = obj(d.positioning);
  return (
    <>
      <div className="row g-4 align-items-center mb-40">
        <div className="col-lg-7">
          {str(d.headline) && <p className="bdx-display-md mb-15">{str(d.headline)}</p>}
          {str(pos.statement) && <p className="bdx-body-md mb-0" style={{ maxWidth: "62ch" }}>{str(pos.statement)}</p>}
        </div>
        <div className="col-lg-5"><Shot prefix="bdx" image={image} fallback={fallback} /></div>
      </div>

      {(str(pos.forWho) || str(pos.against) || str(pos.because)) && (
        <div className="mb-40">
          <Head>The position, in three parts</Head>
          <div className="row g-3">
            {([["For", pos.forWho], ["Against", pos.against], ["Because", pos.because]] as [string, unknown][])
              .filter(([, v]) => str(v))
              .map(([k, v]) => (
                <div key={k} className="col-md-4"><Stat k={k} n={str(v)} /></div>
              ))}
          </div>
        </div>
      )}

      {arr(d.whereToPlay).length > 0 && (
        <div className="mb-40">
          <Head>Where to play</Head>
          <div className="row g-3">
            {arr(d.whereToPlay).map((c, i) => (
              <div key={i} className="col-md-6"><Tile title={str(c.choice)} body={str(c.why)} /></div>
            ))}
          </div>
        </div>
      )}

      {arr(d.howToWin).length > 0 && (
        <div className="mb-40">
          <Head>How to win there</Head>
          <div className="row g-3">
            {arr(d.howToWin).map((m, i) => (
              <div key={i} className="col-md-6">
                <Tile title={str(m.move)}
                      footer={str(m.proof) ? <p className="bdx-caption mb-0 mt-15">Working when — {str(m.proof)}</p> : undefined} />
              </div>
            ))}
          </div>
        </div>
      )}

      {arr(d.moat).length > 0 && (
        <div className="mb-40">
          <Head>What gets harder to copy over time</Head>
          <div className="row g-3">
            {arr(d.moat).map((m, i) => (
              <div key={i} className="col-md-6">
                <Stat k={str(m.monthsToBuild) ? `Takes ${str(m.monthsToBuild)}` : "Advantage"}
                      n={str(m.advantage)} note={str(m.howItCompounds)} dark={i === 0} />
              </div>
            ))}
          </div>
        </div>
      )}

      {list(d.notDoing).length > 0 && (
        <div>
          <Head>What to say no to in year one</Head>
          <Bullets items={list(d.notDoing)} />
        </div>
      )}
    </>
  );
}

function GtmSlide({ d, image, fallback }: Body) {
  return (
    <>
      <div className="row g-4 align-items-center mb-40">
        <div className="col-lg-7">
          {str(d.headline) && <p className="bdx-display-md mb-0">{str(d.headline)}</p>}
        </div>
        <div className="col-lg-5"><Shot prefix="bdx" image={image} fallback={fallback} /></div>
      </div>

      {arr(d.phases).length > 0 && (
        <div className="mb-40">
          <Head>The first ninety days</Head>
          <div className="bdx-timeline">
            {arr(d.phases).map((p, i) => {
              const target = readEstimate(p.target);
              return (
                <div key={i} className="bdx-timeline__item">
                  <span className="bdx-stat__k">{str(p.window) || `Phase ${i + 1}`}</span>
                  <p className="bdx-display-sm mb-10">{str(p.phase)}</p>
                  {str(p.goal) && <p className="bdx-body-md mb-15">{str(p.goal)}</p>}
                  {list(p.actions).length > 0 && (
                    <div className="mb-15"><Numbered items={list(p.actions)} /></div>
                  )}
                  {target && <Figure e={target} />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {arr(d.channels).length > 0 && (
        <div className="mb-40">
          <Head>Where customers come from</Head>
          <div className="row g-3">
            {arr(d.channels).map((c, i) => {
              const cac = readEstimate(c.cac);
              const head = (
                <>
                  <h5 className="bdx-title-md mb-10">{str(c.channel)}</h5>
                  {str(c.whatItIs) && <p className="bdx-body-sm mb-15">{str(c.whatItIs)}</p>}
                  {str(c.effort) && <div className="mb-15"><Meter level={str(c.effort)} label="Effort" /></div>}
                </>
              );
              return (
                <div key={i} className="col-md-6">
                  {cac
                    ? <Figure e={cac} head={head} />
                    : <Tile title={str(c.channel)} body={str(c.whatItIs)}>
                        {str(c.effort) && <div className="mb-15"><Meter level={str(c.effort)} label="Effort" /></div>}
                      </Tile>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {list(d.firstHundred).length > 0 && (
        <div className="mb-40">
          <Head>Finding the first hundred customers</Head>
          <Numbered items={list(d.firstHundred)} />
        </div>
      )}

      {arr(d.messaging).length > 0 && (
        <div>
          <Head>What to actually say</Head>
          <div className="row g-3">
            {arr(d.messaging).map((m, i) => (
              <div key={i} className="col-md-6"><Stat k={str(m.audience)} n={str(m.line)} /></div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function PricingSlide({ d, image, fallback }: Body) {
  const tiers = arr(d.tiers);
  const unit = readEstimates(d.unitEconomics);
  return (
    <>
      <div className="row g-4 align-items-center mb-40">
        <div className="col-lg-7">
          {str(d.headline) && <p className="bdx-display-md mb-15">{str(d.headline)}</p>}
          {str(d.architecture) && <p className="bdx-body-md mb-0" style={{ maxWidth: "62ch" }}>{str(d.architecture)}</p>}
        </div>
        <div className="col-lg-5"><Shot prefix="bdx" image={image} fallback={fallback} /></div>
      </div>

      {tiers.length > 0 && (
        <div className="mb-40">
          <Head>What to charge</Head>
          <div className="row g-3">
            {tiers.map((t, i) => {
              const price = readEstimate(t.price);
              return (
                <div key={i} className={`col-md-${12 / Math.min(tiers.length, 3)}`}>
                  <div className={`bdx-tier${tiers.length > 1 && i === 1 ? " bdx-tier--featured" : ""}`}>
                    <span className="bdx-stat__k">{str(t.name)}</span>
                    {price
                      ? <Figure e={{ ...price, label: "" }} bare />
                      : <span className="bdx-fig__n bdx-fig__n--sm">Price to be set</span>}
                    {str(t.includes) && <p className="bdx-body-sm mb-0 mt-15">{str(t.includes)}</p>}
                    {str(t.who) && <p className="bdx-caption mb-0 mt-10">Bought by — {str(t.who)}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {unit.length > 0 && (
        <div className="mb-40">
          <Head>What is left after costs</Head>
          <div className="row g-3">
            {unit.map((e, i) => (
              <div key={i} className="col-md-6 col-lg-4"><Figure e={e} dark={i === 0} /></div>
            ))}
          </div>
        </div>
      )}

      {arr(d.levers).length > 0 && (
        <div className="mb-40">
          <Head>What to pull when money is tight</Head>
          <div className="row g-3">
            {arr(d.levers).map((l, i) => (
              <div key={i} className="col-md-6"><Tile title={str(l.lever)} body={str(l.effect)} /></div>
            ))}
          </div>
        </div>
      )}

      {list(d.mistakes).length > 0 && (
        <div>
          <Head>Mistakes this trade makes</Head>
          <Bullets items={list(d.mistakes)} />
        </div>
      )}
    </>
  );
}

function FinancialsSlide({ d, image, fallback }: Body) {
  const scenarios = arr(d.scenarios);
  const breakEven = readEstimate(d.breakEven);
  const cash = readEstimate(d.cashNeeded);
  const costs = arr(d.costs);
  return (
    <>
      <div className="row g-4 align-items-center mb-40">
        <div className="col-lg-7">
          {str(d.headline) && <p className="bdx-display-md mb-0">{str(d.headline)}</p>}
        </div>
        <div className="col-lg-5"><Shot prefix="bdx" image={image} fallback={fallback} /></div>
      </div>

      {scenarios.length > 0 && (
        <div className="mb-40">
          <Head>Three versions of year one — none of them a forecast</Head>
          <div className="row g-3">
            {scenarios.map((s, i) => {
              const revenue = readEstimate(s.revenue);
              const volume = readEstimate(s.volume);
              return (
                <div key={i} className={`col-md-${12 / Math.min(scenarios.length, 3)}`}>
                  <div className={`bdx-tier${str(s.name).toLowerCase() === "base" ? " bdx-tier--featured" : ""}`}>
                    <span className="bdx-stat__k">{str(s.name) || `Version ${i + 1}`}</span>
                    {str(s.story) && <p className="bdx-body-sm mb-15">{str(s.story)}</p>}
                    {revenue && <div className="mb-15"><Figure e={revenue} bare /></div>}
                    {volume && <Figure e={volume} bare />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {costs.length > 0 && (
        <div className="mb-40">
          <Head>What it costs to run</Head>
          <div className="row g-3">
            {costs.map((c, i) => {
              const amount = readEstimate(c.amount);
              if (!amount) return null;
              return (
                <div key={i} className="col-md-6">
                  <Figure
                    e={{ ...amount, label: str(c.item) || amount.label }}
                    head={str(c.when)
                      ? <span className="bdx-badge bdx-badge--soft mb-15">{str(c.when)}</span>
                      : undefined}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(breakEven || cash) && (
        <div className="mb-40">
          <Head>How long, and how much cash</Head>
          <div className="row g-3">
            {breakEven && <div className="col-md-6"><Figure e={breakEven} dark /></div>}
            {cash && <div className="col-md-6"><Figure e={cash} dark /></div>}
          </div>
        </div>
      )}

      {list(d.assumptions).length > 0 && (
        <div className="mb-40">
          <Head>What this whole picture rests on</Head>
          <Bullets items={list(d.assumptions)} />
        </div>
      )}

      {list(d.watchouts).length > 0 && (
        <div>
          <Head>What would break it</Head>
          <div className="row g-3">
            {list(d.watchouts).map((w, i) => (
              <div key={i} className="col-md-4"><Tile title="" body={w} /></div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function OperationsSlide({ d, image, fallback }: Body) {
  return (
    <>
      <div className="row g-4 align-items-center mb-40">
        <div className="col-lg-7">
          {str(d.headline) && <p className="bdx-display-md mb-0">{str(d.headline)}</p>}
        </div>
        <div className="col-lg-5"><Shot prefix="bdx" image={image} fallback={fallback} /></div>
      </div>

      {arr(d.daily).length > 0 && (
        <div className="mb-40">
          <Head>Every day</Head>
          <div className="bdx-timeline">
            {arr(d.daily).map((t, i) => (
              <div key={i} className="bdx-timeline__item">
                <span className="bdx-stat__k">
                  {[str(t.when), str(t.minutes) && `${str(t.minutes)} min`].filter(Boolean).join(" · ")}
                </span>
                <p className="bdx-display-sm mb-10">{str(t.task)}</p>
                {str(t.how) && <p className="bdx-body-md mb-0">{str(t.how)}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {(arr(d.weekly).length > 0 || arr(d.monthly).length > 0) && (
        <div className="mb-40">
          <Head>Every week, and every month</Head>
          <div className="row g-3">
            {arr(d.weekly).map((t, i) => (
              <div key={`w${i}`} className="col-md-6">
                <Tile title={str(t.task)} body={str(t.how)}>
                  <span className="bdx-badge bdx-badge--soft mb-15">Weekly</span>
                </Tile>
              </div>
            ))}
            {arr(d.monthly).map((t, i) => (
              <div key={`m${i}`} className="col-md-6">
                <Tile title={str(t.task)} body={str(t.how)}>
                  <span className="bdx-badge bdx-badge--soft mb-15">Monthly</span>
                </Tile>
              </div>
            ))}
          </div>
        </div>
      )}

      {arr(d.standards).length > 0 && (
        <div className="mb-40">
          <Head>Standards a customer would notice</Head>
          <div className="row g-3">
            {arr(d.standards).map((s, i) => (
              <div key={i} className="col-md-4">
                <Stat k={str(s.standard)} n={str(s.target)} note={str(s.why)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {arr(d.roles).length > 0 && (
        <div className="mb-40">
          <Head>Who does what</Head>
          <div className="row g-3">
            {arr(d.roles).map((r, i) => (
              <div key={i} className="col-md-6">
                <Tile title={str(r.role)} body={str(r.does)}
                      footer={str(r.whenToHire) ? <p className="bdx-caption mb-0 mt-15">Bring someone in when — {str(r.whenToHire)}</p> : undefined} />
              </div>
            ))}
          </div>
        </div>
      )}

      {arr(d.tools).length > 0 && (
        <div>
          <Head>Tools, named by the job they do</Head>
          <div className="row g-3">
            {arr(d.tools).map((t, i) => (
              <div key={i} className="col-md-6">
                <div className="bdx-tile" style={{ padding: "16px 20px" }}>
                  <span className="bdx-stat__k">{str(t.job)}</span>
                  <span className="bdx-title-sm d-block mb-1">{str(t.tool)}</span>
                  {str(t.note) && <span className="bdx-caption">{str(t.note)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function SupplySlide({ d, image, fallback }: Body) {
  return (
    <>
      <div className="row g-4 align-items-center mb-40">
        <div className="col-lg-7">
          {str(d.headline) && <p className="bdx-display-md mb-15">{str(d.headline)}</p>}
          {str(d.model) && <p className="bdx-body-md mb-0" style={{ maxWidth: "62ch" }}>{str(d.model)}</p>}
        </div>
        <div className="col-lg-5"><Shot prefix="bdx" image={image} fallback={fallback} /></div>
      </div>

      {arr(d.supplierTypes).length > 0 && (
        <div className="mb-40">
          <Head>Where stock or capacity comes from</Head>
          <div className="row g-3">
            {arr(d.supplierTypes).map((s, i) => {
              const moq = readEstimate(s.minimumOrder);
              return (
                <div key={i} className="col-md-6">
                  <Tile
                    title={str(s.type)}
                    body={str(s.goodFor)}
                    footer={
                      <>
                        {str(s.watchFor) && <p className="bdx-caption mb-0 mt-15">Watch for — {str(s.watchFor)}</p>}
                        {str(s.leadTime) && <p className="bdx-caption mb-0 mt-1">Lead time — {str(s.leadTime)}</p>}
                        {moq && <div className="mt-15"><Figure e={moq} bare /></div>}
                      </>
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {arr(d.selection).length > 0 && (
        <div className="mb-40">
          <Head>How to choose one, before money changes hands</Head>
          <Numbered
            items={arr(d.selection).map((c, i) => (
              <span key={i}>
                <b className="bdx-title-sm">{str(c.criterion)}</b>
                {str(c.howToCheck) ? ` — ${str(c.howToCheck)}` : ""}
              </span>
            ))}
          />
        </div>
      )}

      {arr(d.terms).length > 0 && (
        <div className="mb-40">
          <Head>What to negotiate</Head>
          <div className="row g-3">
            {arr(d.terms).map((t, i) => (
              <div key={i} className="col-md-6">
                <Tile
                  title={str(t.term)}
                  body={str(t.openWith) ? `Open with — ${str(t.openWith)}` : undefined}
                  footer={str(t.walkAwayAt) ? <p className="bdx-caption mb-0 mt-15">Walk away at — {str(t.walkAwayAt)}</p> : undefined}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {arr(d.stockPolicy).length > 0 && (
        <div>
          <Head>How much to hold</Head>
          <Bullets items={arr(d.stockPolicy).map((p) => [str(p.rule), str(p.why)].filter(Boolean).join(" — "))} />
        </div>
      )}
    </>
  );
}

function RiskSlide({ d, image, fallback }: Body) {
  return (
    <>
      <div className="row g-4 align-items-center mb-40">
        <div className="col-lg-7">
          {str(d.headline) && <p className="bdx-display-md mb-0">{str(d.headline)}</p>}
        </div>
        <div className="col-lg-5"><Shot prefix="bdx" image={image} fallback={fallback} /></div>
      </div>

      {arr(d.risks).length > 0 && (
        <div className="mb-40">
          <Head>The register</Head>
          <div className="row g-3">
            {arr(d.risks).map((r, i) => {
              const bad = str(r.likelihood).toLowerCase().startsWith("high")
                && str(r.impact).toLowerCase().startsWith("high");
              return (
                <div key={i} className="col-md-6">
                  <Tile
                    title={str(r.risk)}
                    body={str(r.mitigation) ? `Do now — ${str(r.mitigation)}` : undefined}
                    lift={bad}
                    footer={
                      <>
                        {str(r.earlySignal) && <p className="bdx-caption mb-0 mt-15">First sign — {str(r.earlySignal)}</p>}
                        {str(r.ifItHappens) && <p className="bdx-caption mb-0 mt-1">If it happens — {str(r.ifItHappens)}</p>}
                      </>
                    }
                  >
                    <div className="d-flex flex-wrap gap-3 mb-15">
                      <Meter level={str(r.likelihood)} label="Likelihood" />
                      <Meter level={str(r.impact)} label="Impact" />
                    </div>
                  </Tile>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {arr(d.concentration).length > 0 && (
        <div className="mb-40">
          <Head>Where you are dangerously dependent</Head>
          <div className="row g-3">
            {arr(d.concentration).map((c, i) => (
              <div key={i} className="col-md-4">
                <Stat k="Depends on" n={str(c.dependency)} dark={i === 0}
                      note={[str(c.exposure), str(c.reduceBy)].filter(Boolean).join(" — ")} />
              </div>
            ))}
          </div>
        </div>
      )}

      {str(d.reviewCadence) && <Stat k="Keep it current" n={str(d.reviewCadence)} />}
    </>
  );
}

/**
 * Legal & compliance — the one section nothing generates.
 *
 * It looks like a checklist rather than a set of confident cards because that is
 * what it is: things to go and verify with the body that actually decides them.
 * The final group is the refusal, framed as a refusal.
 */
function LegalSlide({ slug, vertical }: { slug: string | null; vertical: string | null }) {
  const pack = legalPack(slug, vertical);
  return (
    <>
      <p className="bdx-body-md mb-40" style={{ maxWidth: "72ch" }}>{pack.intro}</p>

      {pack.groups.map((g, gi) => {
        const refuse = gi === pack.groups.length - 1;
        return (
          <div key={g.name} className={gi === pack.groups.length - 1 ? "" : "mb-40"}>
            <Head>{g.name}</Head>
            {g.note && <p className="bdx-body-md mb-20" style={{ maxWidth: "72ch" }}>{g.note}</p>}
            <div className={refuse ? "bdx-refuse" : ""}>
              <div className="bdx-check">
                {g.items.map((it) => (
                  <div key={it.title} className="bdx-check__item">
                    <h5 className="bdx-title-md mb-10">{it.title}</h5>
                    <p className="bdx-body-sm mb-0">{it.what}</p>
                    <div className="bdx-check__where">
                      <span className="bdx-caption">{it.where}</span>
                      <a href={it.url} target="_blank" rel="noopener noreferrer">Open the official page</a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

/* ── Dispatch ─────────────────────────────────────────────────────────── */

export default function DossierSlide({
  section, content, seed, mine, blueprintSlug, vertical,
}: {
  section: DossierTab;
  content: unknown;
  /** The business's own words, for the curated fallback photograph. */
  seed: string;
  /** True when this is the owner's own version rather than the shared one. */
  mine: boolean;
  blueprintSlug: string | null;
  vertical: string | null;
}) {
  const d = obj(content);
  // The real photograph, searched against this section's own subject by
  // dossier-run and stored with it. The curated set is the floor beneath it, for
  // sections whose search has not run yet or found nothing.
  const image = obj(d.image) as StageImage;
  const fallback = imageForStage(str(d.imageQuery), seed, sectionIndex(section), 900, 620);
  const body: Body = { d, image, fallback };

  const inner =
    section === "industry" ? <IndustrySlide {...body} />
      : section === "competition" ? <CompetitionSlide {...body} />
        : section === "strategy" ? <StrategySlide {...body} />
          : section === "gtm" ? <GtmSlide {...body} />
            : section === "pricing" ? <PricingSlide {...body} />
              : section === "financials" ? <FinancialsSlide {...body} />
                : section === "operations" ? <OperationsSlide {...body} />
                  : section === "supply" ? <SupplySlide {...body} />
                    : section === "risk" ? <RiskSlide {...body} />
                      : <LegalSlide slug={blueprintSlug} vertical={vertical} />;

  return (
    <section className="bdx-slide" data-cat={getSection(section)?.cat ?? "blue"}>
      <Hero section={section} mine={mine} />
      <div className="bdx-body">{inner}</div>
    </section>
  );
}
