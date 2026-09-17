import { House } from "lucide-react";
import type { WafeModule } from "@/data/core";
import { LocalHomeRepo } from "./local";
import { SupabaseHomeRepo } from "./supabase";
import { aiContext, nudges, search } from "./derive";
import { registerOfflineShell } from "./pwa";
import type { HomeRepo, HomeState } from "./types";

// Home owns the offline shell (see ./pwa.ts): the family opens this screen
// when they have no signal, so registration happens as soon as the module
// registry is evaluated rather than when someone happens to land on "/".
registerOfflineShell();

/**
 * Home owns "/" — the first screen, and the only one that reads every other
 * module. It contributes nothing to the shared dashboard surfaces on purpose:
 * it is the consumer of them. What it does contribute is the rhythm — the
 * evening check-in and the planning session — as follow-ups, plus the last
 * reflection as grounding for the companion.
 */
const home: WafeModule<HomeState, HomeRepo> = {
    id: "home",
    area: "home",
    name: "Home",
    blurb: "The morning briefing, today, what needs you, and the evening check-in.",
    icon: House,
    path: "/",
    visibleTo: ["dashboard.full", "dashboard.child", "dashboard.guest"],
    routes: [
        { path: "", lazy: () => import("./pages/HomePage") },
        // Where Home's two capped lists send you. Both are Home's own screens:
        // "and 53 more across the family" and "3 of 57 — see all" have to land
        // somewhere that actually holds what the link promises.
        { path: "today", lazy: () => import("./pages/TodayPage") },
        { path: "attention", lazy: () => import("./pages/AttentionPage") },
        { path: "planning", lazy: () => import("./pages/PlanningPage") },
        { path: ":memberId/reflections", lazy: () => import("./pages/ReflectionsPage") },
    ],
    createRepo: (ctx) => (ctx.kind === "live" ? new SupabaseHomeRepo(ctx) : new LocalHomeRepo(ctx)),
    nudges,
    aiContext,
    search,
};

export default home;
