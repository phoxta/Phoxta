import { FolderKanban } from "lucide-react";
import type { WafeModule } from "@/data/core";
import { LocalProjectsRepo } from "./local";
import { SupabaseProjectsRepo } from "./supabase";
import { aiContext, dashboard, nudges, search } from "./derive";
import type { ProjectsRepo, ProjectsState } from "./types";

/**
 * Projects & research vault.
 *
 * `visibleTo` includes `projects.view` so a granted teenager (Dami holds it)
 * and a granted guest find the module in their nav; what they then receive is
 * decided by `visibleTo()` in derive.ts, not by the menu.
 *
 * `clip` sits before `:id` on purpose: it is the bookmarklet's landing route
 * and must never be read as a project id.
 */
const projects: WafeModule<ProjectsState, ProjectsRepo> = {
    id: "projects",
    area: "execute",
    name: "Projects & research vault",
    nav: "Projects",
    blurb: "The bigger pieces of work — boards, budgets, clippings, notes, comparisons and the decisions they led to.",
    icon: FolderKanban,
    path: "/execute/projects",
    visibleTo: ["projects.manage", "projects.view"],
    routes: [
        { path: "", lazy: () => import("./pages/ProjectsPage") },
        { path: "clip", lazy: () => import("./pages/ClipPage") },
        { path: "vault", lazy: () => import("./pages/VaultPage") },
        { path: ":id", lazy: () => import("./pages/ProjectPage") },
        { path: ":id/notes/:noteId", lazy: () => import("./pages/NotePage") },
    ],
    createRepo: (ctx) => (ctx.kind === "live" ? new SupabaseProjectsRepo(ctx) : new LocalProjectsRepo(ctx)),
    dashboard,
    nudges,
    aiContext,
    search,
};

export default projects;
