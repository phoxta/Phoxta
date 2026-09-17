import { BookMarked } from "lucide-react";
import type { WafeModule } from "@/data/core";
import { LocalBibleRepo } from "./local";
import { SupabaseBibleRepo } from "./supabase";
import { aiContext, dashboard, nudges, search } from "./derive";
import type { BibleRepo, BibleState } from "./types";

/**
 * Bible, prayer & discipleship.
 *
 * `visibleTo` carries `bible.prayerwall` — the guest capability — because a
 * guest who was granted the wall object has to be able to reach it, and this
 * module's own screens are what render it. A guest who was granted nothing
 * lands on an empty state that says so plainly; there is no hidden list behind
 * it, because `visibleTo()` never put one in their slice.
 */
const bible: WafeModule<BibleState, BibleRepo> = {
    id: "bible",
    area: "grow",
    name: "Bible, prayer & discipleship",
    nav: "Bible & prayer",
    blurb: "Today's scripture, the studies we're on, the verses we're learning by heart, and the wall where we ask and record what God has done.",
    icon: BookMarked,
    path: "/grow/bible",
    visibleTo: ["bible.manage", "bible.assigned", "bible.prayerwall"],
    routes: [
        { path: "", lazy: () => import("./pages/BiblePage") },
        { path: "studies/:id", lazy: () => import("./pages/StudyPage") },
        { path: "prayer", lazy: () => import("./pages/PrayerPage") },
        { path: "verses", lazy: () => import("./pages/VersesPage") },
    ],
    createRepo: (ctx) => (ctx.kind === "live" ? new SupabaseBibleRepo(ctx) : new LocalBibleRepo(ctx)),
    dashboard,
    nudges,
    aiContext,
    search,
};

export default bible;
