import { useMemo, useState } from "react";
import { BookOpen, Volume2 } from "lucide-react";
import { useData, useModule, useModuleState } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import type { CompanionThreadApi } from "@/components/companion/CompanionDrawer";
import homeModule from "../module";
import { EMPTY_HOME, LITTLE_TILE_ORDER, checkInFor, droppedToday, littleSentence, withoutDropped } from "../derive";
import { verseOfTheDay } from "../peek";
import { pickTiles } from "../select";
import type { NewCheckIn } from "../types";
import { CheckInDialog } from "./CheckInDialog";
import { OfflineNotice } from "./bits";
import { CompanionSheet } from "./replica/CompanionSheet";
import { HomeReplica, type ListRow } from "./replica/HomeReplica";
import { childTiles } from "./replica/tiles";

const LITTLE_QUESTIONS = ["What made you smile today?", "Was anything sad?", "What shall we thank God for?"];

/**
 * Ayo is five.
 *
 * The same two cards as everyone else, with no counts anywhere: her first
 * card is the first thing on her day with her own face beside it and a big
 * button that reads the sentence to her; the second is the rest of her day, a
 * big emoji and one line each; after tea the last row becomes "How was
 * today?" — three faces, no typing. The verse is behind the round button on
 * the first card and the "My verse" tile, both of which read it aloud.
 */
export function LittleHome() {
    const sp = useSpace();
    const { dashboard } = useData();
    const { state: loaded, mutate } = useModule(homeModule);
    const state = loaded ?? EMPTY_HOME;
    const { toast } = useToast();
    const [checkInOpen, setCheckInOpen] = useState(false);

    const today = sp.today;
    const hour = new Date().getHours();
    const evening = hour >= 18;
    const first = sp.me.name.split(" ")[0];
    const bibleState = useModuleState<unknown>("bible");
    const verse = useMemo(() => verseOfTheDay(bibleState), [bibleState]);

    const dropped = useMemo(() => droppedToday(state, today, sp.me.id), [state, today, sp.me.id]);
    const mine = useMemo(() => withoutDropped(dashboard.agenda, dropped).filter((a) => a.memberId === sp.me.id || a.memberId === null), [dashboard.agenda, dropped, sp.me.id]);
    const myCheckIn = checkInFor(state, sp.me.id, today);

    const sentence = littleSentence(mine, sp.me.id);
    // Doing modules first (see LITTLE_TILE_ORDER), then one per module, then
    // four. After tea the last tile becomes the check-in, so the screen never
    // grows past one page.
    const tiles = useMemo(() => {
        const ordered = [...dashboard.childCards].sort((a, b) => (LITTLE_TILE_ORDER[a.moduleId] ?? 9) - (LITTLE_TILE_ORDER[b.moduleId] ?? 9));
        return pickTiles(ordered, evening && !myCheckIn ? 3 : 4).shown;
    }, [dashboard.childCards, evening, myCheckIn]);

    const speak = (text: string) => {
        const synth = window.speechSynthesis;
        if (!synth) return;
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "en-GB";
        u.rate = 0.9;
        synth.cancel();
        synth.speak(u);
    };
    const readVerse = () => verse && speak(`${verse.text}. ${verse.reference}`);
    const onVerse = (t: CompanionThreadApi) => {
        if (!verse) {
            t.push({ from: "wafe", text: "No verse is set for this week yet." });
            return;
        }
        t.push({ from: "wafe", text: `**${verse.reference}**\n\n“${verse.text}”` });
        readVerse();
    };

    const saveCheckIn = async (input: NewCheckIn) => {
        await mutate((r) => r.saveCheckIn(input));
        toast("Thank you for telling us about today", "success");
    };

    const lead = tiles[0];
    // Emoji and one line each, and no second line: a module's body text can
    // carry a count ("5 Sprouts"), and her screen shows no numbers at all.
    const rows: ListRow[] = tiles.slice(1).map((c) => ({
        id: `${c.moduleId}:${c.id}`,
        icon: <span aria-hidden="true">{c.emoji}</span>,
        title: c.title,
        href: c.href,
    }));
    if (evening && !myCheckIn) rows.push({ id: "checkin", icon: <span aria-hidden="true">🌙</span>, title: "How was today?", onClick: () => setCheckInOpen(true) });

    return (
        <>
            <HomeReplica
                greeting={`Hi ${first} 👋`}
                greetingExtra={
                    <button type="button" onClick={() => speak(sentence)} aria-label="Read this to me" className="grid size-12 shrink-0 place-items-center rounded-full bg-brand text-white transition-colors hover:bg-brand-hover">
                        <Volume2 size={22} aria-hidden="true" />
                    </button>
                }
                notice={<OfflineNotice />}
                upNext={{
                    heading: "Today",
                    button: { label: "Read me my verse", icon: <BookOpen strokeWidth={2} aria-hidden="true" />, onClick: readVerse },
                    // Her tag is a picture, not a word: the tile's own emoji in its area's colour.
                    tags: lead ? [{ tone: lead.area, label: <span aria-hidden="true">{lead.emoji}</span> }] : [],
                    name: lead ? lead.title : "Nothing yet",
                    sub: sentence,
                    cta: lead ? { label: "Open", href: lead.href } : { label: "OK", href: "/" },
                    art: { kind: "member", memberId: sp.me.id },
                    stats: null,
                    extra: (
                        <button type="button" onClick={() => speak(sentence)} className="hr-speak">
                            <Volume2 aria-hidden="true" /> Read this to me
                        </button>
                    ),
                    deck: 0,
                }}
                list={{
                    heading: "My day",
                    button: { label: "Read this to me", icon: <Volume2 strokeWidth={2} aria-hidden="true" />, onClick: () => speak(rows.map((r) => r.title).join(". ") || sentence) },
                    rows,
                    empty: { line: "Nothing has been set for you yet. Ask a grown-up what today looks like." },
                }}
                band="little"
                sheet={<CompanionSheet tiles={childTiles(hour, { onCheckIn: () => setCheckInOpen(true), onVerse })} />}
            />

            <CheckInDialog
                open={checkInOpen}
                onClose={() => setCheckInOpen(false)}
                today={today}
                existing={myCheckIn}
                openItems={mine.filter((a) => !a.done).slice(0, 3)}
                members={sp.members}
                meId={sp.me.id}
                questions={LITTLE_QUESTIONS}
                tapOnly
                onSave={saveCheckIn}
            />
        </>
    );
}
