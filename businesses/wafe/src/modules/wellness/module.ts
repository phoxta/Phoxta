import { HeartPulse } from "lucide-react";
import type { WafeModule } from "@/data/core";
import { aiContext, dashboard, nudges, search } from "./derive";
import { LocalWellnessRepo } from "./local";
import { SupabaseWellnessRepo } from "./supabase";
import type { WellnessRepo, WellnessState } from "./types";

/**
 * Health, habits, fitness & food — how the family lives in its body.
 *
 * Habits that rest on purpose, routines that put sessions on real dates, the
 * notebook a parent keeps about each body in the house, and the week's meals
 * priced against the food envelope. A child sees their own habits, their own
 * sessions and what is for dinner; a guest sees nothing at all, which is why
 * the manifest lists only the two wellness capabilities.
 */
const wellness: WafeModule<WellnessState, WellnessRepo> = {
    id: "wellness",
    area: "live",
    name: "Health, habits, fitness & food",
    nav: "Health",
    blurb: "Habits with grace days, workout plans on real dates, health notes for each of us, and the week's meals priced against the food budget.",
    icon: HeartPulse,
    path: "/live/wellness",
    visibleTo: ["wellness.manage", "wellness.mine"],
    routes: [
        { path: "", lazy: () => import("./pages/WellnessPage") },
        { path: "habits", lazy: () => import("./pages/HabitsPage") },
        { path: "workouts", lazy: () => import("./pages/WorkoutsPage") },
        { path: "meals", lazy: () => import("./pages/MealsPage") },
        { path: "grocery", lazy: () => import("./pages/GroceryPage") },
        { path: "health", lazy: () => import("./pages/HealthPage") },
        { path: "planning", lazy: () => import("./pages/PlanningPage") },
    ],
    createRepo: (ctx) => (ctx.kind === "live" ? new SupabaseWellnessRepo(ctx) : new LocalWellnessRepo(ctx)),
    dashboard,
    nudges,
    aiContext,
    search,
};

export default wellness;
