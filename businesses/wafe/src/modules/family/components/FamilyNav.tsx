import { NavLink } from "react-router-dom";
import { cn } from "@/lib/cn";
import { useSpace } from "@/state/space";
import { sharesFor } from "../derive";
import { useFamily } from "../hooks";

/**
 * The doors of the Family module. A parent sees all four; a child or a guest
 * sees "Shared with me" (whenever they actually hold something) and their own
 * profile, because that is the whole of what this module is to them.
 */
const TABS: Array<{ to: string; label: string; parentOnly: boolean }> = [
    { to: "/family/members", label: "Members", parentOnly: true },
    { to: "/family/invites", label: "Invitations", parentOnly: true },
    { to: "/family/permissions", label: "Permissions & sharing", parentOnly: true },
    { to: "/family/shared", label: "Shared with me", parentOnly: false },
    { to: "/family/settings", label: "Settings", parentOnly: false },
];

export function FamilyNav({ className }: { className?: string }) {
    const { can, me, role, today } = useSpace();
    const { state } = useFamily();
    const parent = can("family.manage");
    const held = state ? sharesFor(state, me.id, today).length : 0;
    // A parent manages sharing on its own page; everyone else only needs the
    // door when there is something behind it — or when they are a guest, for
    // whom the empty list is still the honest answer.
    const tabs = TABS.filter((t) => (t.to === "/family/shared" ? !parent && (held > 0 || role === "guest") : !t.parentOnly || parent));
    if (tabs.length < 2) return null;
    return (
        <nav aria-label="Family" className={cn("no-scrollbar -mx-5 mb-6 flex gap-2 overflow-x-auto px-5 md:mx-0 md:px-0", className)}>
            {tabs.map((t) => (
                <NavLink
                    key={t.to}
                    to={t.to}
                    className={({ isActive }) =>
                        cn(
                            "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                            isActive ? "border-brand bg-brand text-white" : "border-line-strong bg-card text-muted hover:border-ink hover:text-ink",
                        )
                    }
                >
                    {t.label === "Settings" && !parent ? "My profile" : t.label}
                </NavLink>
            ))}
        </nav>
    );
}
