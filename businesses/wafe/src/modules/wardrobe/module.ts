import { Shirt } from "lucide-react";
import type { WafeModule } from "@/data/core";
import { aiContext, dashboard, nudges, search } from "./derive";
import { LocalWardrobeRepo } from "./local";
import { SupabaseWardrobeRepo } from "./supabase";
import type { WardrobeRepo, WardrobeState } from "./types";

/**
 * Wardrobe & closet manager — what everyone owns, what they are wearing, and
 * what has stopped fitting.
 *
 * The module is in Live because clothes are household infrastructure: the
 * highest-frequency decision in the house and its most wasteful one. Four
 * screens — the closet, the outfits, the week and one garment — and a single
 * pipeline running through them, from "this no longer fits" to the next
 * child's cupboard, the shopping list, the charity bag and the giving ledger.
 *
 * Permissions are the module's spine, not a coat of paint: a parent runs the
 * household's wardrobe, a child gets their own closet and their own week
 * (`wardrobe.mine`, enforced in `visibleTo` and again in the SQL policies),
 * and a guest gets nothing at all — sizes and hand-me-downs are family
 * business.
 */
const wardrobe: WafeModule<WardrobeState, WardrobeRepo> = {
    id: "wardrobe",
    area: "live",
    name: "Wardrobe & closet manager",
    nav: "Wardrobe",
    blurb: "The whole family's closet by owner, season and colour — outfits, the week laid out, trip capsules and hand-me-downs.",
    icon: Shirt,
    path: "/live/wardrobe",
    visibleTo: ["wardrobe.manage", "wardrobe.mine"],
    routes: [
        { path: "", lazy: () => import("./pages/ClosetPage") },
        { path: "outfits", lazy: () => import("./pages/OutfitsPage") },
        { path: "schedule", lazy: () => import("./pages/SchedulePage") },
        { path: "items/:id", lazy: () => import("./pages/ItemPage") },
    ],
    createRepo: (ctx) => (ctx.kind === "live" ? new SupabaseWardrobeRepo(ctx) : new LocalWardrobeRepo(ctx)),
    dashboard,
    nudges,
    aiContext,
    search,
};

export default wardrobe;
