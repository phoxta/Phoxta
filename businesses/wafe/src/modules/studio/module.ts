import { Wand2 } from "lucide-react";
import type { WafeModule } from "@/data/core";
import { aiContext, dashboard, nudges, search } from "./derive";
import { LocalStudioRepo } from "./local";
import { SupabaseStudioRepo } from "./supabase";
import type { StudioRepo, StudioState } from "./types";

/**
 * AI companion & generative studio — the family's concierge, and the room
 * where it makes things.
 *
 * One module, because they are one thing: the companion that answers "what do
 * we need before Lagos?" with its sources attached is the same companion that
 * writes the evening blessing in G. What changes is whether you are asking it
 * ABOUT something or FOR something.
 *
 * A parent gets all of it. A child gets the companion in child mode — a
 * picker rather than a keyboard under eleven, a safety classifier over it —
 * and the studio with kid-safe defaults. A guest sees the outputs the family
 * shared with them and nothing else: no gallery, no meter, not one line of
 * anybody's conversation.
 */
const studio: WafeModule<StudioState, StudioRepo> = {
    id: "studio",
    area: "create",
    name: "AI companion & generative studio",
    nav: "Studio",
    blurb: "Ask about the family's own week and get an answer with its sources — then write the song, the story or the picture that comes out of it.",
    icon: Wand2,
    path: "/create/studio",
    visibleTo: ["studio.full", "studio.child", "studio.limited"],
    routes: [
        { path: "", lazy: () => import("./pages/StudioPage") },
        { path: "songs", lazy: () => import("./pages/SongsPage") },
        { path: "stories", lazy: () => import("./pages/StoriesPage") },
        { path: "images", lazy: () => import("./pages/ImagesPage") },
        { path: "gallery", lazy: () => import("./pages/GalleryPage") },
        { path: "gallery/:id", lazy: () => import("./pages/ItemPage") },
    ],
    createRepo: (ctx) => (ctx.kind === "live" ? new SupabaseStudioRepo(ctx) : new LocalStudioRepo(ctx)),
    dashboard,
    nudges,
    aiContext,
    search,
};

export default studio;
