import { useMemo, useState } from "react";
import { CalendarDays, HandHeart, Heart, Plus } from "lucide-react";
import type { CalendarState } from "@/modules/calendar/types";
import { addDays, greeting, isoDate, shortDate, time } from "@/lib/format";
import { useModuleState } from "@/state/data";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { dayText, prayerWall, trips, upcoming, weekEvents, whenText } from "../peek";
import { OfflineNotice } from "./bits";
import { CompanionSheet } from "./replica/CompanionSheet";
import { Dot, HomeReplica, type ListProps, type UpNextProps } from "./replica/HomeReplica";
import { guestTiles } from "./replica/tiles";

/**
 * A guest's Home is the list of what they were actually given.
 *
 * Mama Fọláké is 68 and 3,000 miles away in Ibadan, and she opens this once or
 * twice a week. Her first card is the next date she is named on — not the
 * family's diary, hers — with three numbers she can act on. Her second is the
 * prayer wall with a one-tap "I'm praying" beside each request, or, without
 * that grant, the dates she is in the diary for. Nothing else is rendered,
 * because nothing else was ever fetched — and no door is drawn that she has
 * no key to.
 */
export function GuestHome() {
    const sp = useSpace();
    const { toast } = useToast();
    const calendarState = useModuleState<CalendarState>("calendar");
    const bibleState = useModuleState<unknown>("bible");
    const travelState = useModuleState<unknown>("travel");
    const [prayedFor, setPrayedFor] = useState<string[]>([]);
    const [cursor, setCursor] = useState(0);

    const today = sp.today;
    const now = useMemo(() => new Date(), []);
    const first = sp.me.name.split(" ")[0];
    const weekStart = isoDate(new Date(`${today}T12:00:00`));
    const all = useMemo(() => weekEvents(calendarState, weekStart, isoDate(addDays(`${weekStart}T12:00:00`, 6))), [calendarState, weekStart]);
    // Only what she is named on. An untagged family event is the family's, not hers.
    const events = useMemo(() => all.filter((e) => e.memberIds.includes(sp.me.id)), [all, sp.me.id]);
    const nextUp = useMemo(() => upcoming(calendarState, now, 3, sp.me.id), [calendarState, now, sp.me.id]);
    const prayers = useMemo(() => prayerWall(bibleState, 8).filter((p) => !p.answered).slice(0, 3), [bibleState]);
    const granted = useMemo(() => trips(travelState, 4), [travelState]);
    const canPray = sp.can("bible.prayerwall");

    const others = (memberIds: string[]): string =>
        memberIds
            .filter((id) => id !== sp.me.id)
            .map((id) => sp.members.find((m) => m.id === id)?.name.split(" ")[0])
            .filter(Boolean)
            .join(", ");

    const pray = (id: string, title: string) => {
        setPrayedFor((v) => (v.includes(id) ? v : [...v, id]));
        toast(`The family will see that you prayed about "${title}"`, "success");
    };

    // ---- the first card: the next date she is named on ----------------------

    const up = nextUp.length ? nextUp[cursor % nextUp.length] : undefined;
    const canTravel = sp.can("travel.view");
    /** Whole days until the first date she is named on, or null. */
    const daysToNext = nextUp[0] ? Math.max(0, Math.round((new Date(`${isoDate(nextUp[0].startAt)}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / 86_400_000)) : null;
    // Only doors she holds a key to: without the travel grant the third number
    // is a countdown rather than a count of things she cannot open.
    const stats = [
        { value: events.length, label: "This week", href: "/execute/calendar" },
        { value: prayers.length, label: "To pray for", href: canPray ? "/grow/bible" : undefined },
        canTravel ? { value: granted.length, label: "Shared trips", href: "/live/travel" } : { value: daysToNext ?? "—", label: "Days to next" },
    ];
    const calendarButton = { label: "Open the calendar", icon: <CalendarDays strokeWidth={2} aria-hidden="true" />, href: "/execute/calendar" };
    const upNext: UpNextProps = up
        ? {
              heading: "In the diary",
              headingHref: "/execute/calendar",
              button: calendarButton,
              tags: [
                  { tone: "execute", dot: true, label: dayText(up.startAt, today, up.endAt) },
                  { tone: "neutral", label: whenText(up) },
              ],
              name: up.title,
              sub: `${up.kindEmoji} ${up.location || (others(up.memberIds) ? `With ${others(up.memberIds)}` : "The family")}`,
              cta: { label: "Open", href: up.href },
              art: up.coverUrl ? { kind: "cover", src: up.coverUrl, theme: "execute" } : { kind: "cover", src: sp.space.coverUrl, theme: "home" },
              stats,
              deck: nextUp.length,
              onNext: () => setCursor((c) => c + 1),
          }
        : {
              heading: "In the diary",
              headingHref: "/execute/calendar",
              button: calendarButton,
              tags: [{ tone: "neutral", label: "Nothing yet" }],
              name: "Nothing in the diary",
              sub: "The family hasn't put you in the diary this week.",
              cta: { label: "Calendar", href: "/execute/calendar" },
              art: { kind: "cover", src: sp.space.coverUrl, theme: "home" },
              stats,
              deck: 0,
          };

    // ---- the second card: the prayer wall, or her dates ---------------------

    const list: ListProps = canPray
        ? {
              heading: "Pray for us",
              headingHref: "/grow/bible",
              button: { label: "Add a prayer", icon: <Plus strokeWidth={2.2} aria-hidden="true" />, href: "/grow/bible" },
              rows: prayers.map((p) => {
                  const praying = prayedFor.includes(p.id);
                  return {
                      id: p.id,
                      icon: <HandHeart strokeWidth={2} />,
                      title: p.title,
                      meta: (
                          <>
                              Prayer wall
                              <Dot />
                              {praying ? "You're praying" : "This week"}
                          </>
                      ),
                      href: "/grow/bible",
                      action: (
                          <button type="button" onClick={() => pray(p.id, p.title)} disabled={praying} className="hr-row__action" aria-label={praying ? `You are praying about "${p.title}"` : `I'm praying about "${p.title}"`} title={praying ? "Praying" : "I'm praying"}>
                              <Heart strokeWidth={2.2} aria-hidden="true" fill={praying ? "currentColor" : "none"} />
                          </button>
                      ),
                  };
              }),
              empty: { line: "Nothing is on the wall this week.", to: "/grow/bible", cta: "Add a prayer" },
              foot: { label: "Prayer wall", href: "/grow/bible" },
          }
        : {
              heading: "This week",
              headingHref: "/execute/calendar",
              button: calendarButton,
              rows: events.slice(0, 3).map((e) => ({
                  id: e.id,
                  icon: <CalendarDays strokeWidth={2} />,
                  title: e.title,
                  meta: (
                      <>
                          {shortDate(e.at)}
                          <Dot />
                          {e.allDay ? "All day" : time(e.at)}
                      </>
                  ),
                  href: e.href,
              })),
              empty: { line: "The family hasn't put you in the diary this week." },
              foot: events.length > 3 ? { label: `Show all · ${events.length}`, href: "/execute/calendar" } : undefined,
          };

    return (
        <HomeReplica
            greeting={`${greeting()}, ${first}`}
            notice={<OfflineNotice />}
            upNext={upNext}
            list={list}
            sheet={<CompanionSheet tiles={guestTiles({ canTravel })} />}
        />
    );
}
