import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Plus, SlidersHorizontal } from "lucide-react";
import { AREA_LABEL, type AgendaItem, type AttentionItem } from "@/data/core";
import type { CalendarState } from "@/modules/calendar/types";
import { addDays, greeting, isoDate } from "@/lib/format";
import { useData, useModule, useModuleState } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { Sprig } from "@/components/brand";
import homeModule from "../module";
import { EMPTY_HOME, attentionKey, checkInFor, droppedToday, homeAttention, isPlanningDay, weekFocus, weekOf, withoutDropped } from "../derive";
import { applyTaskDecision, dayText, upcoming, weekEvents, whenText, type PeekUpcoming } from "../peek";
import { attentionVerb, pickAttention, threeThings } from "../select";
import type { NewCheckIn } from "../types";
import { CheckInDialog } from "./CheckInDialog";
import { QuickAdd } from "./QuickAdd";
import { OfflineNotice } from "./bits";
import { CompanionSheet } from "./replica/CompanionSheet";
import { Dot, HomeReplica, type ListRow, type UpNextArt, type UpNextProps } from "./replica/HomeReplica";
import { parentTiles } from "./replica/tiles";

const ADULT_QUESTIONS = ["What went well today?", "What was hard?", "What is one thing you want to carry into tomorrow?"];

const TONE_LABEL: Record<AttentionItem["tone"], string> = { danger: "Urgent", warn: "Slipping", info: "Waiting", celebrate: "Celebrate" };
/** Area colour is a signal, not a theme: the row's sprig says how urgent it is. */
const TONE_INK: Record<AttentionItem["tone"], string> = { danger: "text-danger", warn: "text-peach", info: "text-brand", celebrate: "text-live" };

/**
 * A parent's Home.
 *
 * Three things on one screen: what is next in the diary (with three honest
 * numbers about today), the three decisions waiting on you, and the
 * companion — who now carries the briefing, the week and the children as
 * one-tap questions rather than as cards. Every capped list still prints its
 * true total and links to the screen that holds the rest.
 *
 * The rituals stay: Quick add (the button on the first card, or "Q"), Sunday
 * planning (the same button), and the evening check-in, which the chat sheet
 * offers as a tile after 17:00 and which still applies each decision to Tasks.
 */
export function ParentHome() {
    const sp = useSpace();
    const navigate = useNavigate();
    const { dashboard, reload: reloadModule, slices } = useData();
    const { state: loaded, mutate } = useModule(homeModule);
    const state = loaded ?? EMPTY_HOME;
    const { toast } = useToast();
    const [checkInOpen, setCheckInOpen] = useState(false);
    const [checkInFrom, setCheckInFrom] = useState<{ step: number; mood?: number }>({ step: 1 });
    const [quickOpen, setQuickOpen] = useState(false);
    /** Which of the next few diary rows the first card is showing. */
    const [cursor, setCursor] = useState(0);

    const today = sp.today;
    const now = useMemo(() => new Date(), []);
    const first = sp.me.name.split(" ")[0];

    const calendarState = useModuleState<CalendarState>("calendar");

    const week = weekOf(today);
    const events = useMemo(() => weekEvents(calendarState, week, isoDate(addDays(`${week}T12:00:00`, 6))), [calendarState, week]);
    const nextUp = useMemo(() => upcoming(calendarState, now, 3), [calendarState, now]);

    // Anything the family let go at a check-in leaves Today altogether: Tasks
    // archives it as "done with a reason", which on this screen would read as
    // "you did it" — the opposite of the decision that was made.
    const dropped = useMemo(() => droppedToday(state, today), [state, today]);
    const agenda = useMemo(() => withoutDropped(dashboard.agenda, dropped), [dashboard.agenda, dropped]);

    const focus = weekFocus(state, today);
    const hasFocus = Boolean(focus && focus.weekStart === week && focus.priorities.length);
    const myCheckIn = checkInFor(state, sp.me.id, today);

    const attention = useMemo(() => {
        const mine = homeAttention({
            agenda,
            events,
            today,
            now,
            hasFocus,
            focusOverdue: !isPlanningDay(today, sp.space.planningDay),
            checkedIn: Boolean(myCheckIn),
            role: "parent",
        });
        return [...dashboard.attention, ...mine].sort((a, b) => b.weight - a.weight);
    }, [agenda, dashboard.attention, events, today, now, hasFocus, sp.space.planningDay, myCheckIn]);

    const things = useMemo(() => threeThings(agenda, { meId: sp.me.id, isParent: true, priorities: focus?.priorities ?? [], now, today }), [agenda, sp.me.id, focus, now, today]);
    const needs = useMemo(() => pickAttention(attention, state.resolved), [attention, state.resolved]);

    const openItems: AgendaItem[] = agenda.filter((a) => !a.done).slice(0, 8);

    const saveCheckIn = async (input: NewCheckIn) => {
        const tasksRepo = slices["tasks"]?.repo;
        const decisions = await Promise.all(input.decisions.map(async (d) => ({ ...d, applied: await applyTaskDecision(tasksRepo, d) })));
        await mutate((r) => r.saveCheckIn({ ...input, decisions }));
        if (decisions.some((d) => d.applied)) await reloadModule("tasks");
        toast("Check-in saved", "success");
    };

    const resolve = async (key: string, resolved: boolean) => {
        await mutate((r) => r.setAttentionResolved(key, resolved));
    };

    const openCheckIn = (step: number, mood?: number) => {
        setCheckInFrom({ step, mood });
        setCheckInOpen(true);
    };

    // "Q" adds whatever just occurred to you, from anywhere on Home.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== "q" && e.key !== "Q") return;
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const t = e.target as HTMLElement | null;
            if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
            e.preventDefault();
            setQuickOpen(true);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const planLabel = isPlanningDay(today, sp.space.planningDay) ? "Sunday planning" : "Plan the week";

    // ---- the first card: what is next in the diary --------------------------

    const up: PeekUpcoming | undefined = nextUp.length ? nextUp[cursor % nextUp.length] : undefined;
    /** The event's own photograph under its area colour; else the person it is about; else the family's. */
    const artFor = (e: PeekUpcoming): UpNextArt => {
        if (e.coverUrl) return { kind: "cover", src: e.coverUrl, theme: "execute" };
        const who = e.colourMemberId ?? (e.memberIds.length === 1 ? e.memberIds[0] : null);
        if (who) return { kind: "member", memberId: who };
        return { kind: "cover", src: sp.space.coverUrl, theme: "home" };
    };

    // Each number is a cap, so each one leads to the page that holds the rest.
    const stats = [
        { value: things.total, label: "Open today", href: "/today" },
        { value: needs.total, label: "Need you", href: "/attention" },
        { value: events.length, label: "This week", href: "/execute/calendar" },
    ];
    const addButton = {
        label: "Add or plan",
        icon: <Plus strokeWidth={2.2} aria-hidden="true" />,
        menu: [
            { label: "Quick add", onSelect: () => setQuickOpen(true) },
            { label: planLabel, onSelect: () => navigate("/planning") },
            { label: "Open the calendar", onSelect: () => navigate("/execute/calendar") },
        ],
    };
    const upNext: UpNextProps = up
        ? {
              heading: "Up next",
              headingHref: "/execute/calendar",
              button: addButton,
              tags: [
                  { tone: "execute", dot: true, label: dayText(up.startAt, today, up.endAt) },
                  { tone: "neutral", label: whenText(up) },
              ],
              name: up.title,
              sub: up.location ? `${up.kindEmoji} ${up.location}` : `${up.kindEmoji} ${up.kindLabel}`,
              cta: { label: "Open", href: up.href },
              art: artFor(up),
              stats,
              deck: nextUp.length,
              onNext: () => setCursor((c) => c + 1),
          }
        : {
              heading: "Up next",
              headingHref: "/execute/calendar",
              button: addButton,
              tags: [{ tone: "neutral", label: "Nothing booked" }],
              name: "The diary is clear",
              sub: "Nothing is coming up yet.",
              cta: { label: "Add an event", href: "/execute/calendar" },
              art: { kind: "cover", src: sp.space.coverUrl, theme: "home" },
              stats,
              deck: 0,
          };

    // ---- the second card: the decisions waiting on you ----------------------

    const rows: ListRow[] = needs.shown.map((a) => ({
        id: attentionKey(a),
        icon: <Sprig strokeWidth={2} className={TONE_INK[a.tone]} />,
        title: a.title,
        meta: (
            <>
                {attentionVerb(a)}
                <Dot />
                {TONE_LABEL[a.tone]}
                <Dot />
                {AREA_LABEL[a.area]}
            </>
        ),
        href: a.href,
        action: (
            <button type="button" onClick={() => void resolve(attentionKey(a), true)} className="hr-row__action" aria-label={`Mark "${a.title}" dealt with`} title="Done">
                <Check strokeWidth={2.4} aria-hidden="true" />
            </button>
        ),
    }));

    return (
        <>
            <HomeReplica
                greeting={`${greeting()}, ${first}`}
                notice={<OfflineNotice />}
                upNext={upNext}
                list={{
                    heading: "Needs you",
                    headingHref: "/attention",
                    button: { label: "See everything waiting", icon: <SlidersHorizontal strokeWidth={2} aria-hidden="true" />, href: "/attention" },
                    rows,
                    // A reward, not a task — so no door is offered.
                    empty: { line: "Nothing is overdue, over budget or waiting on you. That is what a calm week looks like." },
                    foot: needs.total > 0 ? { label: needs.total > rows.length ? `Show all · ${needs.total}` : "See all", href: "/attention" } : undefined,
                }}
                sheet={<CompanionSheet tiles={parentTiles(now.getHours(), { onCheckIn: () => openCheckIn(1) })} />}
            />

            <CheckInDialog
                open={checkInOpen}
                onClose={() => setCheckInOpen(false)}
                today={today}
                existing={myCheckIn}
                openItems={openItems}
                members={sp.members}
                meId={sp.me.id}
                questions={ADULT_QUESTIONS}
                startStep={checkInFrom.step}
                startMood={checkInFrom.mood}
                onSave={saveCheckIn}
            />
            <QuickAdd open={quickOpen} onClose={() => setQuickOpen(false)} />
        </>
    );
}
