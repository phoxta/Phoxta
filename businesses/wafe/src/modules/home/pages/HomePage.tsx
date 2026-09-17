import { dashboardFor } from "@/lib/perms";
import { useSpace } from "@/state/space";
import { ChildHome } from "../components/ChildHome";
import { GuestHome } from "../components/GuestHome";
import { LittleHome } from "../components/LittleHome";
import { ParentHome } from "../components/ParentHome";

/**
 * Home is three products wearing one route.
 *
 * Which one you get is decided by `dashboardFor(me)` — not by a setting, and
 * not by hiding cards from a common layout. A child's Home is composed from a
 * child's slice; a guest's from a guest's. Switching "view as" in the demo
 * re-runs this and the whole screen changes, which is the fastest way to feel
 * how the permission model works.
 */
export default function HomePage() {
    const { me } = useSpace();
    const which = dashboardFor(me);
    // A five-year-old gets her own component, not a child's Home with things
    // hidden: the brief's Little band is one screen, four tiles and a voice.
    if (which === "child" && me.ageBand === "little") return <LittleHome />;
    if (which === "child") return <ChildHome />;
    if (which === "guest") return <GuestHome />;
    return <ParentHome />;
}
