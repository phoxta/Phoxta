import { Link } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { STAGES, COUNTRIES, MODELS } from "@/lib/founder/journey";
import { ALL_TOOLS, toolsForStage } from "@/lib/founder/tools";
import { useVenture } from "@/lib/founder/ventureContext";
import AdvisorPanel from "@/shared/founder/AdvisorPanel";
import "./founder.css";

const ARROW = (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

/**
 * The Founder Toolkit hub. Free, no account, works in any country.
 *
 * The content layer is the `entrepreneur-handbook` skill: HBR's Entrepreneur's
 * Handbook for the method and a researched 2026 layer for what is true now.
 * Provenance is shown throughout on purpose, because most startup advice on the
 * internet cites nothing.
 */
export default function FounderHubPage() {
    const { venture, setProfile, completedCount, ready } = useVenture();

    const featured = ALL_TOOLS.filter((t) => t.featured).slice(0, 6);
    const totalTools = ALL_TOOLS.length;

    return (
        <>
            <PageMeta
                title="Founder Toolkit — free tools to launch and grow a business — Phoxta"
                path="/founder"
            />

            <section className="fd-hero">
                <div className="container">
                    <span className="fd-hero__eyebrow">[ FREE FOUNDER TOOLKIT ]</span>
                    <h1 className="fd-hero__title">
                        Everything you need to launch and grow a business
                    </h1>
                    <p className="fd-hero__lead">
                        {totalTools} tools across the ten stages of building a company, from deciding whether to start to
                        working out what it is worth. Every benchmark shows its source and its year. No account, no cost.
                    </p>
                    <div className="fd-hero__actions">
                        <Link to={`/founder/${STAGES[0].slug}`} className="fd-btn">
                            Start at the beginning {ARROW}
                        </Link>
                        <a href="#stages" className="fd-btn fd-btn--ghost">
                            Jump to a stage
                        </a>
                    </div>
                </div>
            </section>

            <section className="fd-profile">
                <div className="container">
                    <div className="fd-profile__inner">
                        <div className="fd-profile__intro">
                            <h2 className="fd-h2">Set this up once</h2>
                            <p>
                                Where you are changes the legal form, the funding sources and the filing deadlines. What you
                                sell changes which numbers matter. Tell the toolkit both and every tool adjusts.
                            </p>
                            {ready && completedCount > 0 ? (
                                <p className="fd-profile__progress">
                                    {completedCount} of {totalTools} tools completed. Your answers are saved in this browser.
                                </p>
                            ) : null}
                        </div>
                        <div className="fd-profile__fields">
                            <div className="fd-field">
                                <label htmlFor="v-name" className="fd-field__label">
                                    What are you calling it?
                                </label>
                                <input
                                    id="v-name"
                                    type="text"
                                    className="form-control"
                                    placeholder="A working name is fine"
                                    value={venture.name}
                                    onChange={(e) => setProfile({ name: e.target.value })}
                                />
                            </div>
                            <div className="fd-field">
                                <label htmlFor="v-country" className="fd-field__label">
                                    Where will it operate?
                                </label>
                                <select
                                    id="v-country"
                                    className="form-select"
                                    value={venture.country}
                                    onChange={(e) => setProfile({ country: e.target.value })}
                                >
                                    {COUNTRIES.map((c) => (
                                        <option key={c.code} value={c.code}>
                                            {c.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="fd-field">
                                <label htmlFor="v-model" className="fd-field__label">
                                    What kind of business?
                                </label>
                                <select
                                    id="v-model"
                                    className="form-select"
                                    value={venture.model}
                                    onChange={(e) => setProfile({ model: e.target.value as typeof venture.model })}
                                >
                                    <option value="">Not sure yet</option>
                                    {MODELS.map((m) => (
                                        <option key={m.value} value={m.value}>
                                            {m.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="fd-stages" id="stages">
                <div className="container">
                    <h2 className="fd-h2">The ten stages</h2>
                    <p className="fd-sub">
                        The order is the book's, and it is deliberately linear. Real businesses loop back constantly, so
                        work in whatever order your week demands.
                    </p>

                    <div className="fd-stages__grid">
                        {STAGES.map((s) => {
                            const tools = toolsForStage(s.id);
                            const done = tools.filter((t) => venture.tools[t.id]?.completedAt).length;
                            return (
                                <Link key={s.id} to={`/founder/${s.slug}`} className="fd-stage">
                                    <span className="fd-stage__n">{String(s.number).padStart(2, "0")}</span>
                                    <h3 className="fd-stage__title">{s.title}</h3>
                                    <p className="fd-stage__q">{s.question}</p>
                                    <p className="fd-stage__sum">{s.summary}</p>
                                    <span className="fd-stage__foot">
                                        <span>
                                            {tools.length} {tools.length === 1 ? "tool" : "tools"}
                                            {done > 0 ? ` · ${done} done` : ""}
                                        </span>
                                        {ARROW}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </section>

            {featured.length ? (
                <section className="fd-featured">
                    <div className="container">
                        <h2 className="fd-h2">If you only use a few</h2>
                        <p className="fd-sub">The tools that change the most decisions.</p>
                        <div className="fd-featured__grid">
                            {featured.map((t) => (
                                <Link key={t.id} to={`/founder/tool/${t.slug}`} className="fd-card">
                                    <span className="fd-card__kind">{t.kind}</span>
                                    <h3 className="fd-card__title">{t.title}</h3>
                                    <p className="fd-card__blurb">{t.blurb}</p>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            ) : null}

            <section className="fd-prov">
                <div className="container">
                    <div className="fd-prov__inner">
                        <h2 className="fd-h2">Where this comes from</h2>
                        <div className="fd-prov__cols">
                            <div>
                                <h3>The method</h3>
                                <p>
                                    HBR&apos;s Entrepreneur&apos;s Handbook (Harvard Business Review Press, 2018). Thirteen
                                    chapters and four appendices, distilled. It supplies the questions worth asking and the
                                    order to ask them in, which has not dated.
                                </p>
                            </div>
                            <div>
                                <h3>The current numbers</h3>
                                <p>
                                    Thirteen researched supplements written in September 2026, covering what the book skips
                                    entirely, which is sales, marketing, hiring, operations, unit economics and AI, and
                                    refreshing what had aged, which is funding, law, product-market fit and exits.
                                </p>
                            </div>
                            <div>
                                <h3>How to read a number here</h3>
                                <p>
                                    Every benchmark carries its source and year. Business data ages fast, so a 2026 figure
                                    is a starting point for your own measurement, never a target to copy.
                                </p>
                            </div>
                        </div>
                        <p className="fd-prov__legal">
                            General guidance only. Nothing here is legal, tax or investment advice, and anything touching
                            company structure, tax, securities or selling a business needs a qualified professional in your
                            own country.
                        </p>
                    </div>
                </div>
            </section>

            <AdvisorPanel />
        </>
    );
}
