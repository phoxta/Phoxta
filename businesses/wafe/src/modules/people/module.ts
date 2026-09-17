import { HeartHandshake } from "lucide-react";
import type { WafeModule } from "@/data/core";
import { aiContext, dashboard, nudges, search } from "./derive";
import { LocalPeopleRepo } from "./local";
import { SupabasePeopleRepo } from "./supabase";
import type { PeopleRepo, PeopleState } from "./types";

/**
 * People — relatives, friends, communities and mentors.
 *
 * Visible to parents in full; to children as faces, birthdays and the places
 * the family goes; to guests as their own record plus whatever was shared
 * with them, which is why the child and guest dashboards route here at all.
 */
const people: WafeModule<PeopleState, PeopleRepo> = {
    id: "people",
    area: "family",
    name: "People",
    blurb: "Relatives and friends, the communities we belong to, and the people who guide us.",
    icon: HeartHandshake,
    path: "/family/people",
    visibleTo: ["people.manage", "dashboard.child", "dashboard.guest"],
    routes: [
        { path: "", lazy: () => import("./pages/PeoplePage") },
        { path: "relatives/:id", lazy: () => import("./pages/PersonPage") },
        { path: "communities/:id", lazy: () => import("./pages/CommunityPage") },
        { path: "mentors/:id", lazy: () => import("./pages/MentorPage") },
    ],
    createRepo: (ctx) => (ctx.kind === "live" ? new SupabasePeopleRepo(ctx) : new LocalPeopleRepo(ctx)),
    dashboard,
    nudges,
    aiContext,
    search,
};

export default people;
