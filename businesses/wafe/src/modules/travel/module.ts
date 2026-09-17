import { Plane } from "lucide-react";
import type { WafeModule } from "@/data/core";
import { aiContext, dashboard, nudges, search } from "./derive";
import { LocalTravelRepo } from "./local";
import { SupabaseTravelRepo } from "./supabase";
import type { TravelRepo, TravelState } from "./types";

/**
 * Travel & holiday planner — plan a trip well and arrive prepared.
 *
 * Everyone on a trip has a door into it: a parent runs the whole thing, a
 * child sees where we are going and ticks their own bag, and a guest who was
 * granted the trip reads the itinerary and their own list and nothing else.
 * Passports, bookings, prices and papers stop at the parents, in the filter
 * and in the policy.
 */
const travel: WafeModule<TravelState, TravelRepo> = {
    id: "travel",
    area: "live",
    name: "Travel & holiday planner",
    nav: "Travel",
    blurb: "Trips, itineraries, bookings and a packing list each — with the run-up to departure counted down for you.",
    icon: Plane,
    path: "/live/travel",
    visibleTo: ["travel.manage", "travel.view"],
    routes: [
        { path: "", lazy: () => import("./pages/TravelPage") },
        { path: ":id", lazy: () => import("./pages/TripPage") },
        { path: ":id/itinerary", lazy: () => import("./pages/ItineraryPage") },
        { path: ":id/packing", lazy: () => import("./pages/PackingPage") },
    ],
    createRepo: (ctx) => (ctx.kind === "live" ? new SupabaseTravelRepo(ctx) : new LocalTravelRepo(ctx)),
    dashboard,
    nudges,
    aiContext,
    search,
};

export default travel;
