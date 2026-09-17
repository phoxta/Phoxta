import { Flag } from "lucide-react";
import type { WafeModule } from "@/data/core";
import { LocalGoalsRepo } from "./local";
import { SupabaseGoalsRepo } from "./supabase";
import { aiContext, dashboard, nudges, search } from "./derive";
import type { GoalsRepo, GoalsState } from "./types";

/**
 * Vision blueprint, goals & the OKR roadmap.
 *
 * `visibleTo` is `goals.manage` and `goals.view`. Children hold `goals.view` by
 * the role matrix, which is why the module appears for them — and why
 * `derive.visibleTo()` is careful: what a child receives is the family's goals
 * in the family's child-safe words, plus whatever is genuinely theirs. Guests
 * hold nothing here unless a parent grants `goals.view`, and even then they get
 * the shared goals and the celebrations, never the numbers.
 */
const goals: WafeModule<GoalsState, GoalsRepo> = {
    id: "goals",
    area: "execute",
    name: "Goals & vision",
    nav: "Goals",
    blurb: "The vision blueprint, the goals underneath it, and the quarterly roadmap that says what this season is actually for.",
    icon: Flag,
    path: "/execute/goals",
    visibleTo: ["goals.manage", "goals.view"],
    routes: [
        { path: "", lazy: () => import("./pages/GoalsPage") },
        { path: "blueprint", lazy: () => import("./pages/BlueprintPage") },
        { path: "roadmap", lazy: () => import("./pages/RoadmapPage") },
        { path: ":id", lazy: () => import("./pages/GoalPage") },
    ],
    createRepo: (ctx) => (ctx.kind === "live" ? new SupabaseGoalsRepo(ctx) : new LocalGoalsRepo(ctx)),
    dashboard,
    nudges,
    aiContext,
    search,
};

export default goals;
