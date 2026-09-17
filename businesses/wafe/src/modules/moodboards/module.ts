import { LayoutGrid } from "lucide-react";
import type { WafeModule } from "@/data/core";
import { LocalMoodboardsRepo } from "./local";
import { SupabaseMoodboardsRepo } from "./supabase";
import { aiContext, dashboard, nudges, search } from "./derive";
import type { MoodboardsRepo, MoodboardsState } from "./types";

/**
 * Moodboards & inspiration.
 *
 * `visibleTo` is the two moodboards capabilities and nothing else. Children
 * hold `moodboards.view` by role, so the module is in their nav from the
 * start. GUESTS HOLD NEITHER — by design: a guest is not given a module, they
 * are given a board. A parent widens it per person in Family → People ("Pin to
 * moodboards"), and from then on the guest sees this module in their nav and,
 * inside it, only the boards they were named on.
 *
 * `:id/pins/:pinId` is a real route rather than a modal on top of the board,
 * so a pin can be linked to, refreshed and shared — and the lightbox's
 * previous/next is honest navigation rather than hidden state.
 */
const moodboards: WafeModule<MoodboardsState, MoodboardsRepo> = {
    id: "moodboards",
    area: "create",
    name: "Moodboards & inspiration",
    nav: "Moodboards",
    blurb: "Boards of pictures for the things we're planning — the kitchen, the party, the trip — with notes, prices and the people who care about them.",
    icon: LayoutGrid,
    path: "/create/moodboards",
    visibleTo: ["moodboards.manage", "moodboards.view"],
    routes: [
        { path: "", lazy: () => import("./pages/MoodboardsPage") },
        { path: ":id", lazy: () => import("./pages/BoardPage") },
        { path: ":id/pins/:pinId", lazy: () => import("./pages/PinPage") },
    ],
    createRepo: (ctx) => (ctx.kind === "live" ? new SupabaseMoodboardsRepo(ctx) : new LocalMoodboardsRepo(ctx)),
    dashboard,
    nudges,
    aiContext,
    search,
};

export default moodboards;
