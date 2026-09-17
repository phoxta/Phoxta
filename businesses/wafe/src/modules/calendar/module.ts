import { CalendarDays } from "lucide-react";
import type { WafeModule } from "@/data/core";
import { aiContext, dashboard, nudges, search } from "./derive";
import { LocalCalendarRepo } from "./local";
import { SupabaseCalendarRepo } from "./supabase";
import type { CalendarRepo, CalendarState } from "./types";

/**
 * Family calendar — what is happening, for whom, when.
 *
 * Everyone has a door into it: a parent runs it, a child sees their own week
 * and what the family is doing together, and a guest sees the two or three
 * things they were invited to — which is exactly what the guest dashboard
 * links here for.
 */
const calendar: WafeModule<CalendarState, CalendarRepo> = {
    id: "calendar",
    area: "execute",
    name: "Family calendar",
    nav: "Calendar",
    blurb: "The week at a glance — events, deadlines, trips and birthdays, with feeds you can subscribe to.",
    icon: CalendarDays,
    path: "/execute/calendar",
    visibleTo: ["calendar.manage", "calendar.view"],
    routes: [
        { path: "", lazy: () => import("./pages/CalendarPage") },
        { path: "day", lazy: () => import("./pages/DayPage") },
        { path: "week", lazy: () => import("./pages/WeekPage") },
        { path: "month", lazy: () => import("./pages/MonthPage") },
        { path: ":id", lazy: () => import("./pages/EventPage") },
    ],
    createRepo: (ctx) => (ctx.kind === "live" ? new SupabaseCalendarRepo(ctx) : new LocalCalendarRepo(ctx)),
    dashboard,
    nudges,
    aiContext,
    search,
};

export default calendar;
