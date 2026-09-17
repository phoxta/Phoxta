import { Link, Navigate, useParams } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { TOOL_BY_SLUG, toolsForStage } from "@/lib/founder/tools";
import { STAGE_BY_ID } from "@/lib/founder/journey";
import ToolRenderer from "@/shared/founder/ToolRenderer";
import AdvisorPanel from "@/shared/founder/AdvisorPanel";
import "./founder.css";

const ARROW = (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

/** A single tool, plus the next one in its stage. */
export default function FounderToolPage() {
    const { tool: slug } = useParams();
    const tool = slug ? TOOL_BY_SLUG[slug] : undefined;

    if (!tool) return <Navigate to="/founder" replace />;

    const stage = STAGE_BY_ID[tool.stage];
    const siblings = toolsForStage(tool.stage);
    const index = siblings.findIndex((t) => t.id === tool.id);
    const next = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null;

    return (
        <>
            <PageMeta title={`${tool.title} — Founder Toolkit — Phoxta`} path={`/founder/tool/${tool.slug}`} />

            <section className="fd-toolpage">
                <div className="container">
                    <ToolRenderer tool={tool} />

                    <nav className="fd-stagenav" aria-label="Tools">
                        <Link to={`/founder/${stage.slug}`} className="fd-btn fd-btn--ghost">
                            All {stage.title.toLowerCase()} tools
                        </Link>
                        {next ? (
                            <Link to={`/founder/tool/${next.slug}`} className="fd-btn">
                                Next: {next.title.toLowerCase()} {ARROW}
                            </Link>
                        ) : (
                            <Link to="/founder" className="fd-btn">
                                Back to the toolkit {ARROW}
                            </Link>
                        )}
                    </nav>

                    <p className="fd-toolpage__prov">
                        Source: {tool.ref.replace("modern/", "2026 research: ").replace(/\.md$/, "")}. Your answers stay in
                        this browser. General guidance only, not legal, tax or investment advice.
                    </p>
                </div>
            </section>

            <AdvisorPanel stage={stage.title.toLowerCase()} />
        </>
    );
}
