import { MonitorPlay } from "lucide-react";
import type { WafeModule } from "@/data/core";
import { aiContext, dashboard, nudges, search } from "./derive";
import { LocalLearningRepo } from "./local";
import { SupabaseLearningRepo } from "./supabase";
import type { LearningRepo, LearningState } from "./types";

/**
 * Learning Hub — the Grow area's answer to "we watched something useful and
 * then forgot it". Saved lessons, playlists that behave like courses,
 * timestamped notes, companion summaries that always show their source, and
 * plans with real due dates that land on the family's Today.
 */
const learning: WafeModule<LearningState, LearningRepo> = {
    id: "learning",
    area: "grow",
    name: "Learning Hub",
    nav: "Learning",
    blurb: "Turn what we watch into something we keep: playlists, notes, summaries and a plan.",
    icon: MonitorPlay,
    path: "/grow/learning",
    visibleTo: ["learning.manage", "learning.assigned"],
    routes: [
        { path: "", lazy: () => import("./pages/LearningPage") },
        { path: "playlists/:id", lazy: () => import("./pages/PlaylistPage") },
        { path: "lessons/:id", lazy: () => import("./pages/LessonPage") },
    ],
    createRepo: (ctx) => (ctx.kind === "live" ? new SupabaseLearningRepo(ctx) : new LocalLearningRepo(ctx)),
    dashboard,
    nudges,
    aiContext,
    search,
};

export default learning;
