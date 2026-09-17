import { Bell } from "lucide-react";
import type { WafeModule } from "@/data/core";
import { aiContext, dashboard, nudges, search } from "./derive";
import { LocalNotificationsRepo } from "./local";
import { SupabaseNotificationsRepo } from "./supabase";
import type { NotificationsRepo, NotificationsState } from "./types";

/**
 * Notification centre & follow-up engine.
 *
 * One calm inbox for everything that needs a person, and the rules — as data a
 * parent can edit — that decide what is worth interrupting a family for.
 */
const notifications: WafeModule<NotificationsState, NotificationsRepo> = {
    id: "notifications",
    area: "home",
    name: "Notifications",
    blurb: "One inbox for everything that needs you, and the follow-up rules behind it.",
    icon: Bell,
    path: "/home/notifications",
    visibleTo: ["notifications.view"],
    routes: [
        { path: "", lazy: () => import("./pages/InboxPage") },
        { path: "settings", lazy: () => import("./pages/SettingsPage") },
    ],
    createRepo: (ctx) => (ctx.kind === "live" ? new SupabaseNotificationsRepo(ctx) : new LocalNotificationsRepo(ctx)),
    dashboard,
    nudges,
    aiContext,
    search,
};

export default notifications;
