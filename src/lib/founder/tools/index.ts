import type { StageId, Tool } from "../types";
import { FIT_TOOLS } from "./fit";
import { OPPORTUNITY_TOOLS } from "./opportunity";
import { MODEL_TOOLS } from "./model";
import { LEGAL_TOOLS } from "./legal";
import { PLAN_TOOLS } from "./plan";
import { CAPITAL_TOOLS } from "./capital";
import { OPERATE_TOOLS } from "./operate";
import { GROWTH_TOOLS } from "./growth";
import { SCALE_TOOLS } from "./scale";
import { HARVEST_TOOLS } from "./harvest";

/**
 * The tool registry. One flat list, indexed by slug for routing and grouped by
 * stage for the journey pages. Tool definitions are pure data: six renderers in
 * `@/shared/founder` turn any of them into a working screen.
 */
export const ALL_TOOLS: Tool[] = [
    ...FIT_TOOLS,
    ...OPPORTUNITY_TOOLS,
    ...MODEL_TOOLS,
    ...LEGAL_TOOLS,
    ...PLAN_TOOLS,
    ...CAPITAL_TOOLS,
    ...OPERATE_TOOLS,
    ...GROWTH_TOOLS,
    ...SCALE_TOOLS,
    ...HARVEST_TOOLS,
];

export const TOOL_BY_SLUG: Record<string, Tool> = Object.fromEntries(
    ALL_TOOLS.map((t) => [t.slug, t]),
);

export const TOOL_BY_ID: Record<string, Tool> = Object.fromEntries(ALL_TOOLS.map((t) => [t.id, t]));

/** Tools for a stage, in the order the stage lists them. */
export function toolsForStage(stage: StageId): Tool[] {
    return ALL_TOOLS.filter((t) => t.stage === stage);
}
