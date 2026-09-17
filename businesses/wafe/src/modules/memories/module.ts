import { Images } from "lucide-react";
import type { WafeModule } from "@/data/core";
import { aiContext, dashboard, nudges, search } from "./derive";
import { LocalMemoriesRepo } from "./local";
import { SupabaseMemoriesRepo } from "./supabase";
import type { MemoriesRepo, MemoriesState } from "./types";

/**
 * Albums, timeline & reels — where the family keeps the story it is living.
 *
 * One module rather than three, because they are one thing: the pictures are
 * the albums, the albums are the timeline, and a reel is an album played. What
 * changes is only how far back you are standing.
 *
 * A parent has all of it. A child sees the family's albums, adds to the ones
 * they were made a contributor of, and watches the reels. A guest sees exactly
 * the albums and reels that were granted to them by name — or opened by a live
 * link — and never learns that anything else exists.
 */
const memories: WafeModule<MemoriesState, MemoriesRepo> = {
    id: "memories",
    area: "create",
    name: "Albums, timeline & reels",
    nav: "Memories",
    blurb: "Every picture, gathered into albums and one family timeline — and the reels that play them back, shared by a link rather than a file.",
    icon: Images,
    path: "/create/memories",
    visibleTo: ["memories.manage", "memories.view"],
    routes: [
        { path: "", lazy: () => import("./pages/MemoriesPage") },
        { path: "albums/:id", lazy: () => import("./pages/AlbumPage") },
        { path: "reels/:id", lazy: () => import("./pages/ReelPage") },
        { path: "reels/:id/play", lazy: () => import("./pages/ReelPlayerPage") },
        { path: "timeline", lazy: () => import("./pages/TimelinePage") },
    ],
    createRepo: (ctx) => (ctx.kind === "live" ? new SupabaseMemoriesRepo(ctx) : new LocalMemoriesRepo(ctx)),
    dashboard,
    nudges,
    aiContext,
    search,
};

export default memories;
