import { Link, NavLink } from "react-router-dom";
import { Check, Lock, Pause, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/format";
import { MemberAvatar } from "@/components/shared";
import { Ring } from "@/components/ui/charts";
import { ProgressBar, Tag } from "@/components/ui/primitives";
import type { Goal, GoalsState, Milestone, Pillar } from "../types";
import { PILLAR_LABEL, SCOPE_LABEL } from "../types";
import { goalPct, milestonesOf, nextMilestone } from "../derive";

/** Module-private furniture: the sub-nav, the goal card, the small tags. */

const BASE = "/execute/goals";

const TABS: Array<{ to: string; label: string; end?: boolean }> = [
    { to: BASE, label: "Goals", end: true },
    { to: `${BASE}/blueprint`, label: "Vision blueprint" },
    { to: `${BASE}/roadmap`, label: "Roadmap" },
];

export function GoalsNav({ className }: { className?: string }) {
    return (
        <nav aria-label="Goals" className={cn("no-scrollbar -mx-5 mb-6 flex gap-2 overflow-x-auto px-5 md:mx-0 md:px-0", className)}>
            {TABS.map((t) => (
                <NavLink
                    key={t.to}
                    to={t.to}
                    end={t.end}
                    className={({ isActive }) =>
                        cn("shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors", isActive ? "border-brand bg-brand text-white" : "border-line-strong bg-card text-muted hover:border-ink hover:text-ink")
                    }
                >
                    {t.label}
                </NavLink>
            ))}
        </nav>
    );
}

/** Pillars borrow the area palette so the roadmap reads like the rest of Wàfè. */
const PILLAR_TONE: Record<Pillar, "brand" | "grow" | "execute" | "live" | "create" | "home" | "ok"> = {
    faith: "brand",
    grow: "grow",
    execute: "execute",
    live: "live",
    create: "create",
    home: "home",
    money: "live",
    health: "ok",
};

export function PillarTag({ pillar, className }: { pillar: Pillar; className?: string }) {
    return (
        <Tag tone={PILLAR_TONE[pillar]} className={className}>
            {PILLAR_LABEL[pillar]}
        </Tag>
    );
}

export function StatusTag({ goal }: { goal: Goal }) {
    if (goal.status === "done") {
        return (
            <Tag tone="ok" icon={<Check size={11} aria-hidden="true" />}>
                Done
            </Tag>
        );
    }
    if (goal.status === "paused") {
        return (
            <Tag tone="neutral" icon={<Pause size={11} aria-hidden="true" />}>
                Paused
            </Tag>
        );
    }
    return null;
}

/** "Mine · private", "Family", "Ours · shared with 2". */
export function ScopeLine({ goal, className }: { goal: Goal; className?: string }) {
    const bits: string[] = [SCOPE_LABEL[goal.scope]];
    if (goal.visibility === "private") bits.push("private");
    else if (goal.visibility === "shared") bits.push(`shared with ${goal.sharedWith.length}`);
    return (
        <span className={cn("inline-flex items-center gap-1.5 text-xs text-caption", className)}>
            {goal.visibility === "private" ? <Lock size={11} aria-hidden="true" /> : goal.scope === "family" ? <Users size={11} aria-hidden="true" /> : null}
            {bits.join(" · ")}
        </span>
    );
}

/** The milestone dots the roadmap and the cards share. */
export function MilestoneDots({ milestones, className }: { milestones: Milestone[]; className?: string }) {
    if (!milestones.length) return null;
    return (
        <span className={cn("inline-flex items-center gap-1", className)} aria-label={`${milestones.filter((m) => m.done).length} of ${milestones.length} milestones done`}>
            {milestones.slice(0, 8).map((m) => (
                <span key={m.id} className={cn("size-1.5 rounded-full", m.done ? "bg-brand" : "bg-line-strong")} title={m.title} />
            ))}
        </span>
    );
}

export function GoalCard({ state, goal, big }: { state: GoalsState; goal: Goal; big?: boolean }) {
    const pct = goalPct(state, goal);
    const ms = milestonesOf(state, goal.id);
    const next = nextMilestone(state, goal.id);
    return (
        <li>
            <Link to={`${BASE}/${goal.id}`} className={cn("flex h-full gap-4 rounded-xl bg-card p-4 transition-shadow hover:shadow-hover", goal.status === "paused" && "opacity-70")}>
                <Ring pct={pct} size={big ? 72 : 58} stroke={3} label={`${goal.title}: ${pct}%`}>
                    <span className={cn("font-semibold tabular-nums", big ? "text-base" : "text-sm")}>{pct}%</span>
                </Ring>
                <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex flex-wrap items-center gap-1.5">
                        <PillarTag pillar={goal.pillar} />
                        <StatusTag goal={goal} />
                    </span>
                    <span className={cn("clamp-2 mt-2 font-semibold leading-5", big ? "text-[17px]" : "text-base")}>{goal.title}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <ScopeLine goal={goal} />
                        {goal.valueLabel && <span className="text-xs text-caption">· {goal.valueLabel}</span>}
                    </span>
                    <span className="mt-auto flex items-center gap-2 pt-3">
                        <MilestoneDots milestones={ms} />
                        <span className="min-w-0 flex-1 truncate text-xs text-caption">
                            {goal.status === "done" ? "Finished" : next ? `Next: ${next.title}` : `Target ${shortDate(goal.targetDate)}`}
                        </span>
                        <MemberAvatar memberId={goal.ownerMemberId} size="xs" />
                    </span>
                </span>
            </Link>
        </li>
    );
}

/** The big warm card a child gets. */
export function ChildGoalCard({ state, goal, mine }: { state: GoalsState; goal: Goal; mine: boolean }) {
    const pct = goalPct(state, goal);
    const next = mine ? nextMilestone(state, goal.id) : undefined;
    return (
        <li>
            <Link to={mine ? `${BASE}/${goal.id}` : BASE} className="flex h-full items-start gap-3 rounded-xl bg-card p-4 transition-shadow hover:shadow-hover">
                <span className="text-6xl leading-none" aria-hidden="true">
                    {mine ? "🎯" : "🌱"}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-[17px] font-semibold leading-6">{goal.title}</span>
                    <span className="mt-0.5 block text-md leading-5 text-muted">{next ? `Next: ${next.title}` : mine ? "Keep going — you're on your way." : "Something the whole family is working on."}</span>
                    <ProgressBar value={pct} className="mt-3" label={`${goal.title} progress`} />
                    <span className="mt-1.5 block text-xs text-caption tabular-nums">{pct}%</span>
                </span>
            </Link>
        </li>
    );
}

/** A soft horizontal bar per pillar — the "Our Future" roll-up. */
export function PillarBars({ rows }: { rows: Array<{ pillar: Pillar; label: string; pct: number; count: number }> }) {
    return (
        <ul className="flex flex-col gap-3">
            {rows.map((r) => (
                <li key={r.pillar} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 truncate text-sm font-medium">{r.label}</span>
                    <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-track">
                        <span className="block h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${r.pct}%` }} />
                    </span>
                    <span className="w-16 shrink-0 text-right text-xs tabular-nums text-caption">
                        {r.pct}% · {r.count}
                    </span>
                </li>
            ))}
        </ul>
    );
}
