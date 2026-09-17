import { Link, Navigate, useParams } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { STAGES, STAGE_BY_SLUG } from "@/lib/founder/journey";
import { toolsForStage } from "@/lib/founder/tools";
import { useVenture } from "@/lib/founder/ventureContext";
import AdvisorPanel from "@/shared/founder/AdvisorPanel";
import "./founder.css";

const ARROW = (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const TICK = (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M3 8.5L6.5 12L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

/** One stage: the question it answers, the gate to pass, and its tools. */
export default function FounderStagePage() {
    const { stage: slug } = useParams();
    const stage = slug ? STAGE_BY_SLUG[slug] : undefined;
    const { venture } = useVenture();

    if (!stage) return <Navigate to="/founder" replace />;

    const tools = toolsForStage(stage.id);
    const index = STAGES.findIndex((s) => s.id === stage.id);
    const prev = index > 0 ? STAGES[index - 1] : null;
    const next = index < STAGES.length - 1 ? STAGES[index + 1] : null;
    const done = tools.filter((t) => venture.tools[t.id]?.completedAt).length;

    return (
        <>
            <PageMeta title={`${stage.title} — Founder Toolkit — Phoxta`} path={`/founder/${stage.slug}`} />

            <section className="fd-stagehead">
                <div className="container">
                    <div className="fd-tool__crumbs">
                        <Link to="/founder">Toolkit</Link>
                        <span aria-hidden="true">/</span>
                        <span>{stage.title}</span>
                    </div>
                    <span className="fd-stagehead__n">Stage {String(stage.number).padStart(2, "0")}</span>
                    <h1 className="fd-stagehead__title">{stage.title}</h1>
                    <p className="fd-stagehead__q">{stage.question}</p>
                    <p className="fd-stagehead__sum">{stage.summary}</p>

                    <div className="fd-gate">
                        <span className="fd-gate__label">You are done here when</span>
                        <span className="fd-gate__text">{stage.gate}</span>
                    </div>

                    <p className="fd-stagehead__src">
                        Built from {stage.handbook.join(", ")} of the handbook
                        {stage.modern.length ? `, updated by the 2026 research (${stage.modern.join(", ")})` : ""}.
                    </p>
                </div>
            </section>

            <section className="fd-toollist">
                <div className="container">
                    <h2 className="fd-h2">
                        {tools.length} {tools.length === 1 ? "tool" : "tools"}
                        {done > 0 ? <span className="fd-toollist__done"> · {done} completed</span> : null}
                    </h2>

                    <div className="fd-toollist__grid">
                        {tools.map((t) => {
                            const state = venture.tools[t.id];
                            return (
                                <Link key={t.id} to={`/founder/tool/${t.slug}`} className="fd-card">
                                    <span className="fd-card__kind">{t.kind}</span>
                                    <h3 className="fd-card__title">{t.title}</h3>
                                    <p className="fd-card__blurb">{t.blurb}</p>
                                    {state?.result?.label ? (
                                        <span className="fd-card__result">
                                            {state.completedAt ? TICK : null} {state.result.label}
                                        </span>
                                    ) : null}
                                </Link>
                            );
                        })}
                    </div>

                    <nav className="fd-stagenav" aria-label="Stages">
                        {prev ? (
                            <Link to={`/founder/${prev.slug}`} className="fd-btn fd-btn--ghost">
                                Back to {prev.title.toLowerCase()}
                            </Link>
                        ) : (
                            <span />
                        )}
                        {next ? (
                            <Link to={`/founder/${next.slug}`} className="fd-btn">
                                On to {next.title.toLowerCase()} {ARROW}
                            </Link>
                        ) : (
                            <Link to="/founder" className="fd-btn">
                                Back to the toolkit {ARROW}
                            </Link>
                        )}
                    </nav>
                </div>
            </section>

            <AdvisorPanel stage={stage.title.toLowerCase()} />
        </>
    );
}
