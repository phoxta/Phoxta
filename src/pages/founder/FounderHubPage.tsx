import { Link } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import RevealText from "@/shared/effects/RevealText";
import { COUNTRIES, MODELS } from "@/lib/founder/journey";
import { ALL_TOOLS } from "@/lib/founder/tools";
import { useVenture } from "@/lib/founder/ventureContext";
import AdvisorPanel from "@/shared/founder/AdvisorPanel";
import FounderHero from "@/shared/sections/founder/Hero";
import FounderStory from "@/shared/sections/founder/Story";
import FounderStagesScroll from "@/shared/sections/founder/StagesScroll";
import { STAGE_IMAGE } from "@/lib/founder/media";
import "./founder.css";

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

            <FounderHero />
            <FounderStory />

            <section className="fd-profile">
                <div className="container">
                    <div className="fd-profile__inner at_fade_anim" data-fade-from="bottom" data-delay=".1">
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

            <FounderStagesScroll />

            {featured.length ? (
                <section className="fd-featured">
                    <div className="container">
                        <h2 className="fd-h2 reveal-text"><RevealText>If you only use a few</RevealText></h2>
                        <p className="fd-sub">The tools that change the most decisions.</p>
                        {/* Each featured tool carries its stage's image, so the row reads
                            as a set of things rather than a list of links. at_fade_anim is
                            picked up by FadeAnimEffect; the stagger comes from data-delay. */}
                        <div className="fd-featured__grid">
                            {featured.map((t, i) => (
                                <Link
                                    key={t.id}
                                    to={`/founder/tool/${t.slug}`}
                                    className="fd-card fd-card--visual at_fade_anim"
                                    data-fade-from="bottom"
                                    data-delay={(0.1 + i * 0.08).toFixed(2)}
                                >
                                    <span className="fd-card__shot">
                                        <img
                                            src={STAGE_IMAGE[t.stage]}
                                            alt=""
                                            width={640}
                                            height={400}
                                            loading="lazy"
                                        />
                                    </span>
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
                        <h2 className="fd-h2 reveal-text"><RevealText>Where this comes from</RevealText></h2>
                        <div className="fd-prov__cols at_fade_anim" data-fade-from="bottom" data-delay=".15">
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
