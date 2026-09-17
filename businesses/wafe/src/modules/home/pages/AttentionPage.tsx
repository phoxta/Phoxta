import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useData, useModule, useModuleState } from "@/state/data";
import { useSpace } from "@/state/space";
import { PageTitle } from "@/components/shared";
import homeModule from "../module";
import { EMPTY_HOME, checkInFor, droppedToday, homeAttention, isPlanningDay, weekFocus, weekOf, withoutDropped } from "../derive";
import { weekEvents } from "../peek";
import { addDays, isoDate } from "@/lib/format";
import { AttentionList } from "../components/panels";

/**
 * The whole queue — where "3 of 57 — see all" lands.
 *
 * Home shows three decisions, one per module, because each module already
 * writes its own summary row ("5 things are overdue") and three is what a
 * morning can hold. This page holds the rest, grouped by where it came from,
 * with the same "dealt with" and "bring back" affordances — and it is where
 * the rules that decide what ends up here are written down, because a family's
 * morning is not the place to document a rules engine.
 */
export default function AttentionPage() {
    const sp = useSpace();
    const { dashboard } = useData();
    const { state: loaded, mutate } = useModule(homeModule);
    const state = loaded ?? EMPTY_HOME;
    const calendarState = useModuleState<unknown>("calendar");

    const today = sp.today;
    const now = useMemo(() => new Date(), []);
    const week = weekOf(today);
    const events = useMemo(() => weekEvents(calendarState, week, isoDate(addDays(`${week}T12:00:00`, 6))), [calendarState, week]);

    const dropped = useMemo(() => droppedToday(state, today), [state, today]);
    const agenda = useMemo(() => withoutDropped(dashboard.agenda, dropped), [dashboard.agenda, dropped]);
    const focus = weekFocus(state, today);

    const items = useMemo(() => {
        const mine = homeAttention({
            agenda,
            events,
            today,
            now,
            hasFocus: Boolean(focus && focus.weekStart === week && focus.priorities.length),
            focusOverdue: !isPlanningDay(today, sp.space.planningDay),
            checkedIn: Boolean(checkInFor(state, sp.me.id, today)),
            role: sp.role,
        });
        return [...dashboard.attention, ...mine].sort((a, b) => b.weight - a.weight);
    }, [agenda, dashboard.attention, events, today, now, focus, week, sp.space.planningDay, sp.role, sp.me.id, state]);

    const resolve = async (key: string, resolved: boolean) => {
        await mutate((r) => r.setAttentionResolved(key, resolved));
    };

    return (
        <div>
            <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand underline-offset-4 hover:underline">
                <ArrowLeft size={14} aria-hidden="true" /> Home
            </Link>
            <PageTitle title="Needs you" sub="Everything overdue, over budget, waiting on a decision or inside the next 48 hours." area="home" />
            <AttentionList items={items} resolvedKeys={state.resolved} canResolve={sp.role === "parent"} onResolve={(k, v) => void resolve(k, v)} />
        </div>
    );
}
