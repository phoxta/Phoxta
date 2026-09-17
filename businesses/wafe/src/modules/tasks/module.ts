import { ListChecks } from "lucide-react";
import type { WafeModule } from "@/data/core";
import { LocalTasksRepo } from "./local";
import { SupabaseTasksRepo } from "./supabase";
import { aiContext, dashboard, nudges, search } from "./derive";
import type { TasksRepo, TasksState } from "./types";

/**
 * Tasks & chores.
 *
 * `visibleTo` carries `tasks.view` on purpose: a guest holds no manage or
 * assigned capability, but the trip prep a parent handed them has to be
 * reachable, and this module's own screens are what render it — as a list of
 * exactly those tasks, with a tick and nothing else.
 */
const tasks: WafeModule<TasksState, TasksRepo> = {
    id: "tasks",
    area: "execute",
    name: "Tasks & chores",
    nav: "Tasks",
    blurb: "Everything the household has to do — list, board and month — with the chores, the rota and what the Sprouts are worth.",
    icon: ListChecks,
    path: "/execute/tasks",
    visibleTo: ["tasks.manage", "tasks.assigned", "tasks.view"],
    routes: [
        { path: "", lazy: () => import("./pages/TasksPage") },
        { path: "board", lazy: () => import("./pages/BoardPage") },
        { path: "calendar", lazy: () => import("./pages/CalendarPage") },
        { path: ":id", lazy: () => import("./pages/TaskPage") },
    ],
    createRepo: (ctx) => (ctx.kind === "live" ? new SupabaseTasksRepo(ctx) : new LocalTasksRepo(ctx)),
    dashboard,
    nudges,
    aiContext,
    search,
};

export default tasks;
