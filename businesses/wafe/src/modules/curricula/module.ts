import { GraduationCap } from "lucide-react";
import type { WafeModule } from "@/data/core";
import { LocalCurriculaRepo } from "./local";
import { SupabaseCurriculaRepo } from "./supabase";
import { aiContext, dashboard, nudges, search } from "./derive";
import type { CurriculaRepo, CurriculaState } from "./types";

/**
 * Children's curricula.
 *
 * `visibleTo` is deliberately short: parents run it, children get their own
 * half of it, and a guest holds neither capability — school work is not a
 * house-guest's business, and the module is not in their nav at all.
 */
const curricula: WafeModule<CurriculaState, CurriculaRepo> = {
    id: "curricula",
    area: "grow",
    name: "Children's curricula",
    nav: "Curricula",
    blurb: "Subjects, assignments and marks for each child — with badges, milestones and the month's character challenge.",
    icon: GraduationCap,
    path: "/grow/curricula",
    visibleTo: ["curricula.manage", "curricula.mine"],
    routes: [
        { path: "", lazy: () => import("./pages/CurriculaPage") },
        { path: ":memberId", lazy: () => import("./pages/ChildPage") },
        { path: ":memberId/assignments/:id", lazy: () => import("./pages/AssignmentPage") },
    ],
    createRepo: (ctx) => (ctx.kind === "live" ? new SupabaseCurriculaRepo(ctx) : new LocalCurriculaRepo(ctx)),
    dashboard,
    nudges,
    aiContext,
    search,
};

export default curricula;
