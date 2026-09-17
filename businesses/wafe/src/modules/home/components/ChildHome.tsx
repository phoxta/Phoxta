import { useMemo, useState } from "react";
import { ListChecks, PartyPopper, SlidersHorizontal } from "lucide-react";
import type { AgeBand, AgendaItem } from "@/data/core";
import { greeting, time } from "@/lib/format";
import { useData, useModule, useModuleState } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { Points } from "@/components/shared";
import type { CompanionThreadApi } from "@/components/companion/CompanionDrawer";
import homeModule from "../module";
import { EMPTY_HOME, checkInFor, droppedToday, withoutDropped } from "../derive";
import { readingToday, verseOfTheDay } from "../peek";
import { pickTiles, threeThings, tierOf } from "../select";
import type { NewCheckIn } from "../types";
import { CheckInDialog } from "./CheckInDialog";
import { OfflineNotice } from "./bits";
import { CompanionSheet } from "./replica/CompanionSheet";
import { Dot, HomeReplica, type ListProps, type UpNextProps } from "./replica/HomeReplica";
import { childTiles } from "./replica/tiles";

/**
 * A child's Home, for everyone but the five-year-old (she has her own screen —
 * see LittleHome).
 *
 * The band decides what fills the two cards, not just the wording.
 *
 *   JUNIOR (Tobi, 9) keeps §6's five names — Today · Learn · Do · Create · My
 *   Garden — as the second card, in an order that never changes, each with
 *   its own count and its own top item. His first card is the top thing on
 *   his list; his three numbers are Learn, Do and Create.
 *
 *   TEEN gets his lists, capped and counted, plus his Sprouts.
 *
 *   YOUNG ADULT (Dami, 15) is near-parent, scoped to herself: her own three
 *   things, her own open/done, and no "Needs you", because a parent's queue is
 *   not a fifteen-year-old's job.
 *
 * The verse is one tap away in the chat — the "My verse" tile reads it aloud
 * — and the evening check-in is a tile after 18:00.
 */

const BAND_QUESTIONS: Record<AgeBand, string[]> = {
    little: ["What made you smile today?", "Was anything sad?", "What shall we thank God for?"],
    junior: ["What made you happy today?", "What was tricky?", "What do you want to do tomorrow?"],
    teen: ["What was the best bit of today?", "Was anything unfair or difficult?", "What are you hoping for tomorrow?"],
    "young-adult": ["What went well today?", "What was hard?", "What do you want tomorrow to look like?"],
    adult: ["What went well today?", "What was hard?", "What is one thing you want to carry into tomorrow?"],
};

/** §6's five names for Tobi's world, in the order he will always find them. */
interface Destination {
    key: string;
    label: string;
    emoji: string;
    /** How many are open behind this name — the honest count, one tap away. */
    count: number;
    /** The single top thing, so the tile answers its own question. */
    top: string;
    href: string;
}

/** What a child calls a row, from the module it came from. */
const KIND: Record<string, { label: string; emoji: string }> = {
    tasks: { label: "Chore", emoji: "🧹" },
    learning: { label: "Lesson", emoji: "📚" },
    curricula: { label: "Lesson", emoji: "📚" },
    books: { label: "Reading", emoji: "📖" },
    calendar: { label: "Diary", emoji: "📅" },
    bible: { label: "Verse", emoji: "✝️" },
    wellness: { label: "Habit", emoji: "💪" },
    wardrobe: { label: "Outfit", emoji: "👕" },
    memories: { label: "Memory", emoji: "📷" },
};
const kindOf = (moduleId: string) => KIND[moduleId] ?? { label: "To do", emoji: "✅" };

export function ChildHome() {
    const sp = useSpace();
    const { dashboard } = useData();
    const { state: loaded, mutate } = useModule(homeModule);
    const state = loaded ?? EMPTY_HOME;
    const { toast } = useToast();
    const [checkInOpen, setCheckInOpen] = useState(false);
    const [checkInFrom, setCheckInFrom] = useState<{ step: number; mood?: number }>({ step: 1 });
    const [cursor, setCursor] = useState(0);

    const today = sp.today;
    const now = useMemo(() => new Date(), []);
    const band = sp.me.ageBand;
    const junior = band === "junior";
    const grown = band === "young-adult";
    const first = sp.me.name.split(" ")[0];

    const booksState = useModuleState<unknown>("books");
    const bibleState = useModuleState<unknown>("bible");

    const dropped = useMemo(() => droppedToday(state, today, sp.me.id), [state, today, sp.me.id]);
    const mine = useMemo(
        () => withoutDropped(dashboard.agenda, dropped).filter((a) => a.memberId === sp.me.id || a.memberId === null),
        [dashboard.agenda, dropped, sp.me.id],
    );
    const open = mine.filter((a) => !a.done);
    const done = mine.length - open.length;
    const allDone = mine.length > 0 && open.length === 0;

    const verse = useMemo(() => verseOfTheDay(bibleState), [bibleState]);
    const reading = useMemo(() => readingToday(booksState, sp.me.id), [booksState, sp.me.id]);
    const myCheckIn = checkInFor(state, sp.me.id, today);

    const things = useMemo(() => threeThings(mine, { meId: sp.me.id, isParent: false, priorities: [], now, today, max: 3 }), [mine, sp.me.id, now, today]);

    /** Tobi's five names, each with its own count and its own top item. */
    const destinations = useMemo<Destination[]>(() => {
        const byArea = (test: (a: AgendaItem) => boolean): AgendaItem[] => open.filter(test);
        const learn = byArea((a) => a.moduleId === "learning" || a.moduleId === "curricula" || a.moduleId === "books");
        const chores = byArea((a) => a.moduleId === "tasks");
        const create = dashboard.childCards.filter((c) => c.area === "create");
        const next = open[0];
        return [
            { key: "today", label: "Today", emoji: "☀️", count: open.length, top: next ? `${next.title}${next.at ? ` at ${time(next.at)}` : ""}` : "Everything is done", href: "/execute/tasks" },
            { key: "learn", label: "Learn", emoji: "📚", count: learn.length, top: learn[0]?.title ?? (reading ? `${reading.title} — ${reading.meta}` : "Nothing set for today"), href: "/grow/learning" },
            { key: "do", label: "Do", emoji: "🧹", count: chores.length, top: chores.slice(0, 2).map((c) => c.title).join(" · ") || "No chores today", href: "/execute/tasks" },
            { key: "create", label: "Create", emoji: "🎨", count: create.length, top: create[0]?.title ?? "Make something and show a grown-up", href: create[0]?.href ?? "/create/studio" },
        ];
    }, [open, dashboard.childCards, reading]);

    const tiles = useMemo(() => pickTiles(dashboard.childCards, band === "teen" ? 8 : 6), [dashboard.childCards, band]);

    const saveCheckIn = async (input: NewCheckIn) => {
        await mutate((r) => r.saveCheckIn(input));
        toast("Thanks for telling us about today", "success");
    };

    const openCheckIn = (step: number, mood?: number) => {
        setCheckInFrom({ step, mood });
        setCheckInOpen(true);
    };

    const speak = (text: string) => {
        const synth = window.speechSynthesis;
        if (!synth) return;
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "en-GB";
        u.rate = 0.9;
        synth.cancel();
        synth.speak(u);
    };

    /** The "My verse" tile: the verse into the chat, and read aloud. */
    const onVerse = (t: CompanionThreadApi) => {
        if (!verse) {
            t.push({ from: "wafe", text: "No verse is set for this week yet. Ask a grown-up to pick one on the Bible page." });
            return;
        }
        t.push({ from: "wafe", text: `**${verse.reference}**\n\n“${verse.text}”` });
        speak(`${verse.text}. ${verse.reference}`);
    };

    // ---- the first card: the top thing on the list --------------------------

    const lead = things.shown;
    const up = lead.length ? lead[cursor % lead.length] : undefined;
    const stats = junior
        ? destinations.slice(1).map((d) => ({ value: d.count, label: d.label }))
        : [
              { value: open.length, label: "Open" },
              { value: done, label: "Done" },
              { value: sp.me.points, label: "Sprouts" },
          ];
    const listButton = { label: "All my things", icon: <ListChecks strokeWidth={2} aria-hidden="true" />, href: junior ? "/execute/tasks" : "/today" };
    const upNext: UpNextProps = up
        ? {
              heading: "Up next",
              headingHref: junior ? "/execute/tasks" : "/today",
              button: listButton,
              tags: [
                  { tone: up.area, dot: true, label: `${kindOf(up.moduleId).emoji} ${kindOf(up.moduleId).label}` },
                  { tone: "neutral", label: up.at ? time(up.at) : "Today" },
              ],
              name: up.title,
              sub: up.meta,
              cta: { label: "Open", href: up.href },
              art: { kind: "member", memberId: sp.me.id },
              stats,
              deck: lead.length,
              onNext: () => setCursor((c) => c + 1),
          }
        : {
              heading: "Up next",
              headingHref: junior ? "/execute/tasks" : "/today",
              button: listButton,
              tags: [{ tone: "ok", dot: true, label: mine.length ? "All done" : "Nothing yet" }],
              name: mine.length ? "Everything is done" : "Nothing on your list",
              sub: mine.length ? "Brilliant. Enjoy the rest of today." : "Ask a grown-up what today looks like.",
              cta: { label: "My lists", href: "/execute/tasks" },
              art: { kind: "member", memberId: sp.me.id },
              stats,
              deck: 0,
          };

    // ---- the second card: the band's own list -------------------------------

    const seeAllButton = { label: "See everything", icon: <SlidersHorizontal strokeWidth={2} aria-hidden="true" />, href: junior ? "/execute/tasks" : "/today" };
    let list: ListProps;
    if (junior) {
        list = {
            heading: "My world",
            button: seeAllButton,
            rows: destinations.map((d) => ({
                id: d.key,
                icon: <span aria-hidden="true">{d.emoji}</span>,
                title: d.label,
                meta: (
                    <>
                        {d.count > 0 ? `${d.count} ${d.count === 1 ? "thing" : "things"}` : "all done"}
                        <Dot />
                        <span className="min-w-0 truncate">{d.top}</span>
                    </>
                ),
                href: d.href,
            })),
            foot: { label: `🌱 My Garden · ${sp.me.points} Sprouts`, href: "/execute/tasks" },
        };
    } else if (grown) {
        const rows = open.filter((a) => tierOf(a.moduleId) !== "routine").slice(0, 3);
        list = {
            heading: "Today",
            headingHref: "/today",
            button: seeAllButton,
            rows: rows.map((a) => ({
                id: `${a.moduleId}:${a.id}`,
                icon: <span aria-hidden="true">{kindOf(a.moduleId).emoji}</span>,
                title: a.title,
                meta: (
                    <>
                        {a.meta}
                        {a.at && (
                            <>
                                <Dot />
                                {time(a.at)}
                            </>
                        )}
                    </>
                ),
                href: a.href,
            })),
            empty: { line: "Nothing is due today. That is allowed.", to: "/execute/tasks", cta: "My lists" },
            foot: open.length > rows.length ? { label: `Show all · ${open.length}`, href: "/today" } : undefined,
        };
    } else {
        const rows = tiles.shown.slice(0, 3);
        list = {
            heading: "My lists",
            headingHref: "/execute/tasks",
            button: seeAllButton,
            rows: rows.map((c) => ({
                id: `${c.moduleId}:${c.id}`,
                icon: <span aria-hidden="true">{c.emoji}</span>,
                title: c.title,
                meta: <span className="min-w-0 truncate">{c.body}</span>,
                href: c.href,
            })),
            empty: { line: "Nothing on your lists today.", to: "/execute/tasks", cta: "My lists" },
            foot: tiles.total > rows.length ? { label: `Show all · ${tiles.total}`, href: "/execute/tasks" } : undefined,
        };
    }

    return (
        <>
            <HomeReplica
                greeting={`${greeting()}, ${first}`}
                greetingExtra={<Points n={sp.me.points} />}
                notice={
                    <>
                        {allDone && (
                            <div className="flex items-center gap-3 rounded-xl bg-mint-soft px-5 py-3 text-mint" role="status">
                                <span className="animate-bounce text-4xl leading-none" aria-hidden="true">
                                    🎉
                                </span>
                                <p className="text-base font-semibold">Everything on your list is done. Brilliant.</p>
                                <PartyPopper size={18} className="ml-auto shrink-0" aria-hidden="true" />
                            </div>
                        )}
                        <OfflineNotice />
                    </>
                }
                upNext={upNext}
                list={list}
                band={band}
                sheet={<CompanionSheet tiles={childTiles(now.getHours(), { onCheckIn: () => openCheckIn(1), onVerse })} />}
            />

            <CheckInDialog
                open={checkInOpen}
                onClose={() => setCheckInOpen(false)}
                today={today}
                existing={myCheckIn}
                openItems={open.filter((a) => tierOf(a.moduleId) !== "routine").slice(0, grown ? 6 : 3)}
                members={sp.members}
                meId={sp.me.id}
                questions={BAND_QUESTIONS[band] ?? BAND_QUESTIONS.junior}
                tapOnly={junior}
                startStep={checkInFrom.step}
                startMood={checkInFrom.mood}
                onSave={saveCheckIn}
            />
        </>
    );
}
