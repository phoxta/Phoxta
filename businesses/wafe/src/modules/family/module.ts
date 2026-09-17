import { Users } from "lucide-react";
import type { WafeModule } from "@/data/core";
import { aiContext, dashboard, nudges, search } from "./derive";
import { LocalFamilyRepo } from "./local";
import { SupabaseFamilyRepo } from "./supabase";
import type { FamilyRepo, FamilyState } from "./types";

/**
 * Family — the tenant and the trust boundary.
 *
 * The module owns `/family` itself rather than a sub-path, because everything
 * under it is one thing: who is in the family and who sees what. The index
 * redirects to Members (a parent's door) and every other route is a deep link
 * that survives a refresh.
 *
 * `visibleTo` includes `notifications.view` on purpose — every role holds it —
 * because /family/settings is also where a child picks their colour and a
 * guest fixes their own name. The PAGES gate their sections with `can()`;
 * only Settings and Shared render anything for a non-parent — and Shared is
 * the guest's whole product: the named things they were given.
 */
const family: WafeModule<FamilyState, FamilyRepo> = {
    id: "family",
    area: "family",
    name: "Family space",
    nav: "Family",
    blurb: "Who is in the family, what we value, and who can see what.",
    icon: Users,
    path: "/family",
    visibleTo: ["family.manage", "notifications.view"],
    routes: [
        { path: "", lazy: () => import("./pages/IndexPage") },
        { path: "members", lazy: () => import("./pages/MembersPage") },
        { path: "members/:id", lazy: () => import("./pages/MemberPage") },
        { path: "invites", lazy: () => import("./pages/InvitesPage") },
        { path: "permissions", lazy: () => import("./pages/PermissionsPage") },
        { path: "shared", lazy: () => import("./pages/SharedPage") },
        { path: "settings", lazy: () => import("./pages/SettingsPage") },
    ],
    createRepo: (ctx) => (ctx.kind === "live" ? new SupabaseFamilyRepo(ctx) : new LocalFamilyRepo(ctx)),
    dashboard,
    nudges,
    aiContext,
    search,
};

export default family;
