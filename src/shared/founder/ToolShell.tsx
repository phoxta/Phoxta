import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Tool } from "@/lib/founder/types";
import { STAGE_BY_ID } from "@/lib/founder/journey";

const CHECK = (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M3 8.5L6.5 12L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

/**
 * Common frame for every tool: what it is, where it came from, and whether
 * the founder has finished it. Provenance is deliberately always visible, so
 * nobody has to wonder whether a number was invented.
 */
export default function ToolShell({
    tool,
    done,
    children,
    footer,
}: {
    tool: Tool;
    done?: boolean;
    children: ReactNode;
    footer?: ReactNode;
}) {
    const stage = STAGE_BY_ID[tool.stage];

    return (
        <div className="fd-tool">
            <div className="fd-tool__head">
                <div className="fd-tool__crumbs">
                    <Link to="/founder">Toolkit</Link>
                    <span aria-hidden="true">/</span>
                    <Link to={`/founder/${stage.slug}`}>{stage.title}</Link>
                </div>
                <h1 className="fd-tool__title">{tool.title}</h1>
                <p className="fd-tool__blurb">{tool.blurb}</p>
                <div className="fd-tool__meta">
                    {tool.basedOn ? <span className="fd-tool__based">Based on {tool.basedOn}</span> : null}
                    {done ? (
                        <span className="fd-tool__done">
                            {CHECK} Saved
                        </span>
                    ) : null}
                </div>
            </div>

            <div className="fd-tool__body">{children}</div>

            {footer ? <div className="fd-tool__foot">{footer}</div> : null}
        </div>
    );
}
