import { Library } from "lucide-react";
import type { WafeModule } from "@/data/core";
import { LocalBooksRepo } from "./local";
import { SupabaseBooksRepo } from "./supabase";
import { aiContext, dashboard, nudges, search } from "./derive";
import type { BooksRepo, BooksState } from "./types";

/**
 * Library & Book-to-Course.
 *
 * `visibleTo` carries `dashboard.guest` on purpose: a mentor guest holds no
 * books capability, but a course explicitly shared with them has to be
 * reachable, and the module's own screens are what render it (as a read-only
 * list of exactly the courses they were given). A guest with nothing shared
 * gets an empty state, never someone else's shelf.
 */
const books: WafeModule<BooksState, BooksRepo> = {
    id: "books",
    area: "grow",
    name: "Library & courses",
    nav: "Library",
    blurb: "What we're reading, who is on which page, and the books we turned into four weeks the family finished.",
    icon: Library,
    path: "/grow/books",
    visibleTo: ["books.manage", "books.view", "dashboard.guest"],
    routes: [
        { path: "", lazy: () => import("./pages/BooksPage") },
        { path: ":id", lazy: () => import("./pages/BookPage") },
        { path: ":id/course", lazy: () => import("./pages/CoursePage") },
    ],
    createRepo: (ctx) => (ctx.kind === "live" ? new SupabaseBooksRepo(ctx) : new LocalBooksRepo(ctx)),
    dashboard,
    nudges,
    aiContext,
    search,
};

export default books;
