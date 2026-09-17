import type { CompanionThreadApi } from "@/components/companion/CompanionDrawer";
import type { SheetTile } from "./CompanionSheet";

/**
 * The picture tiles under the chat, by role and by the hour.
 *
 * Every tile is either one of the drawer's own chips or a local action, so a
 * tap always does something real: it asks the companion, reads the verse, or
 * opens the evening check-in. The pictures are the app's own photographs.
 */

const img = (name: string): string => `/images/${name}.jpg`;

export function parentTiles(hour: number, o: { onCheckIn: () => void }): SheetTile[] {
    const evening = hour >= 17;
    const when = hour < 12 ? "morning" : evening ? "evening" : "midday";
    return [
        { key: "briefing", label: "Briefing", image: img("notifications-morning"), chip: { label: "Prepare my briefing", action: "briefing", payload: { when } } },
        { key: "week", label: "This week", image: img("calendar-hero"), chip: { label: "What's on this week?", action: "ask", prompt: "What's on for the family this week?" } },
        { key: "needs", label: "Needs you", image: img("home-planning"), chip: { label: "What needs my attention?", action: "ask", prompt: "What needs my attention right now? Prioritise, and say why." } },
        evening
            ? { key: "checkin", label: "Check in", image: img("notifications-quiet"), onSelect: o.onCheckIn }
            : { key: "children", label: "Children", image: img("curricula-hero"), chip: { label: "How are the children doing?", action: "ask", prompt: "How are the children doing this week — learning, chores, anything slipping?" } },
        { key: "money", label: "Money", image: img("finance-hero"), chip: { label: "How is the budget looking?", action: "ask", prompt: "How is the household budget looking this month? What is over or close, and what is left in the plan?" } },
        { key: "prayer", label: "Prayer", image: img("bible-prayer"), chip: { label: "What can we pray for?", action: "ask", prompt: "What is on the family's prayer wall this week, and what has been answered?" } },
    ];
}

export function childTiles(hour: number, o: { onCheckIn: () => void; onVerse: (t: CompanionThreadApi) => void }): SheetTile[] {
    const evening = hour >= 18;
    return [
        { key: "today", label: "Today", image: img("tasks-tidy"), chip: { label: "What do I need to do today?", action: "ask", prompt: "What do I need to do today? Keep it short and friendly." } },
        { key: "story", label: "A story", image: img("books-picture"), chip: { label: "Tell me a story about courage", action: "ask", prompt: "Tell me a short story about courage, for someone my age." } },
        { key: "verse", label: "My verse", image: img("bible-open"), onSelect: o.onVerse },
        { key: "chores", label: "Chores", image: img("tasks-dishwasher"), chip: { label: "What chores do I have?", action: "ask", prompt: "Which chores are mine this week, and which are done?" } },
        { key: "pray", label: "Pray", image: img("bible-prayer"), chip: { label: "Pray with me", action: "ask", prompt: "Help me pray about something on my mind. Keep it short and kind." } },
        evening
            ? { key: "checkin", label: "Check in", image: img("notifications-quiet"), onSelect: o.onCheckIn }
            : { key: "learning", label: "Learning", image: img("learning-wonder"), chip: { label: "What am I learning this week?", action: "ask", prompt: "What am I learning this week?" } },
    ];
}

export function guestTiles(o: { canTravel: boolean }): SheetTile[] {
    const tiles: SheetTile[] = [
        { key: "week", label: "This week", image: img("calendar-hero"), chip: { label: "What's on this week?", action: "ask", prompt: "What's on for the family this week?" } },
        { key: "pray", label: "Prayer", image: img("bible-prayer"), chip: { label: "What can I pray for?", action: "ask", prompt: "What is on the family's prayer wall that I can pray for?" } },
        { key: "next", label: "Next event", image: img("family-table"), chip: { label: "When is the next family event?", action: "ask", prompt: "When is the next family event I am part of?" } },
    ];
    if (o.canTravel) tiles.push({ key: "trips", label: "Trips", image: img("travel-hero"), chip: { label: "What trips are shared with me?", action: "ask", prompt: "Which trips has the family shared with me, and when are they?" } });
    return tiles;
}
