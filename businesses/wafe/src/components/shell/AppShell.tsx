import { useEffect, useMemo, useRef, useState, type CSSProperties, type ComponentType, type FormEvent } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Bell, ChevronDown, Home, LayoutGrid, LogOut, Palette, Search, Settings, Sparkles, Sprout, Sun, Target, Users } from "lucide-react";
import { AREA_LABEL, ROLE_LABEL, type Area, type Capability, type WafeModule } from "@/data/core";
import { cn } from "@/lib/cn";
import { greeting } from "@/lib/format";
import { MODULES } from "@/modules";
import { useAuth } from "@/state/auth";
import { useSpace } from "@/state/space";
import { useTenant } from "@/state/tenant";
import { Wordmark } from "@/components/brand";
import { MemberAvatar, Points } from "@/components/shared";
import { Button, IconButton, Kbd } from "@/components/ui/primitives";
import { Dialog, Toasts } from "@/components/ui/overlay";
import { CompanionDrawer } from "@/components/companion/CompanionDrawer";
import { NotificationsDrawer } from "@/components/shell/NotificationsDrawer";

/**
 * The frame a family lives in.
 *
 * Desktop: a 260px sidebar grouped by area (Home, then Grow · Execute · Live ·
 * Create · Family), a sticky topbar with search, the bell and "Ask Wàfè", and
 * the page. Phone: an app bar, a bottom tab bar of the areas and a "More"
 * sheet. The nav is computed from the module registry and the member's
 * capabilities, so a child's shell simply has fewer doors — and a calmer look.
 *
 * In the demo the banner's "Viewing as" switcher is the product's spine made
 * visible: one change of member re-renders every screen under that role.
 */

type IconType = ComponentType<{ size?: number; strokeWidth?: number; className?: string; "aria-hidden"?: boolean | "true" }>;
type Group = { area: Area; items: WafeModule[] };

const AREA_ORDER: Area[] = ["grow", "execute", "live", "create", "family"];

const DOT: Record<Area, string> = {
    home: "bg-home",
    grow: "bg-grow",
    execute: "bg-execute",
    live: "bg-live",
    create: "bg-create",
    family: "bg-family",
};

/** The area's colour appears on the icon of the row you are on — the one
 *  place in a Primer-grey sidebar where the IA gets to speak. */
const AREA_TEXT: Record<Area, string> = {
    home: "text-home",
    grow: "text-grow",
    execute: "text-execute",
    live: "text-live",
    create: "text-create",
    family: "text-family",
};

const AREA_ICON: Record<Area, IconType> = { home: Home, grow: Sprout, execute: Target, live: Sun, create: Palette, family: Users };

const TABS: Array<{ to: string; label: string; area: Area; end?: boolean }> = [
    { to: "/", label: "Home", area: "home", end: true },
    { to: "/grow", label: "Grow", area: "grow" },
    { to: "/execute", label: "Execute", area: "execute" },
    { to: "/live", label: "Live", area: "live" },
    { to: "/create", label: "Create", area: "create" },
];

/** The modules this member may see, grouped by area in nav order. */
function useNav(): { home: WafeModule[]; groups: Group[] } {
    const { can } = useSpace();
    return useMemo(() => {
        const visible = (MODULES as WafeModule[]).filter((m) => m.visibleTo.some((c: Capability) => can(c)));
        return {
            home: visible.filter((m) => m.area === "home" && m.path !== "/"),
            groups: AREA_ORDER.map((area) => ({ area, items: visible.filter((m) => m.area === area) })).filter((g) => g.items.length > 0),
        };
    }, [can]);
}

function NavItem({ to, end, label, icon: Icon, area, big, onClick }: { to: string; end?: boolean; label: string; icon: IconType; area: Area; big?: boolean; onClick?: () => void }) {
    return (
        <NavLink
            to={to}
            end={end}
            onClick={onClick}
            className={({ isActive }) =>
                cn(
                    "flex items-center gap-3 rounded-sm px-3 transition-colors",
                    big ? "py-2.5 text-lg" : "py-2.5 text-md",
                    isActive ? "bg-brand-soft font-semibold text-brand-ink" : "font-medium text-muted hover:bg-subtle hover:text-ink",
                )
            }
        >
            {({ isActive }) => (
                <>
                    <Icon size={big ? 21 : 19} strokeWidth={1.9} aria-hidden="true" className={isActive ? AREA_TEXT[area] : "text-caption"} />
                    <span className="flex-1 truncate">{label}</span>
                </>
            )}
        </NavLink>
    );
}

/** The grouped nav, shared by the sidebar and the phone's "More" sheet. */
function NavGroups({ home, groups, big, onNavigate }: { home: WafeModule[]; groups: Group[]; big?: boolean; onNavigate?: () => void }) {
    return (
        <>
            <NavItem to="/" end label="Home" icon={Home} area="home" big={big} onClick={onNavigate} />
            {home.map((m) => (
                <NavItem key={m.id} to={m.path} label={m.nav ?? m.name} icon={m.icon} area={m.area} big={big} onClick={onNavigate} />
            ))}
            {groups.map((g) => (
                <div key={g.area} className="mt-5">
                    <NavLink
                        to={`/${g.area}`}
                        end
                        onClick={onNavigate}
                        className={({ isActive }) => cn("mb-1 flex items-center gap-2 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.06em] transition-colors", isActive ? "text-brand" : "text-caption hover:text-ink")}
                        title={`${AREA_LABEL[g.area]} overview`}
                    >
                        <span className={cn("size-1.5 rounded-full", DOT[g.area])} aria-hidden="true" />
                        {AREA_LABEL[g.area]}
                    </NavLink>
                    {g.items.map((m) => (
                        <NavItem key={m.id} to={m.path} label={m.nav ?? m.name} icon={m.icon} area={m.area} big={big} onClick={onNavigate} />
                    ))}
                </div>
            ))}
        </>
    );
}

function DemoBanner() {
    const { members, me, viewAs, space } = useSpace();
    const { leaveDemo } = useAuth();
    const navigate = useNavigate();
    return (
        <div className="mx-5 mb-1 flex min-w-0 items-center gap-2 rounded-sm bg-brand-soft px-3 py-2 text-sm text-brand-ink md:mx-8">
            <span className="shrink-0 rounded-full bg-card px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ring-brand/20">Demo</span>
            <span className="shrink-0 max-sm:hidden">{space.name}</span>
            {/* On a phone the caption goes screen-reader-only and the select may
                shrink: the row must never wrap or push the page wider than the viewport. */}
            <label className="flex min-w-0 items-center gap-1.5">
                <span className="shrink-0 whitespace-nowrap max-sm:sr-only">· Viewing as</span>
                <span className="relative block min-w-0">
                    <select
                        value={me.id}
                        onChange={(e) => viewAs(e.target.value)}
                        className="h-7 w-full appearance-none truncate rounded-md border border-line-strong bg-card pl-2.5 pr-7 text-sm font-semibold text-ink shadow-xs outline-none focus:border-brand"
                    >
                        {members.map((m) => (
                            <option key={m.id} value={m.id}>
                                {m.name.split(" ")[0]} ({m.relation} · {ROLE_LABEL[m.role]})
                            </option>
                        ))}
                    </select>
                    <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" aria-hidden="true" />
                </span>
            </label>
            <button
                type="button"
                onClick={() => {
                    leaveDemo();
                    navigate("/signup");
                }}
                className="ml-auto shrink-0 font-semibold underline underline-offset-4 hover:text-brand"
            >
                <span className="sm:hidden">Create yours</span>
                <span className="max-sm:hidden">Create your own family</span>
            </button>
        </div>
    );
}

export function AppShell() {
    const sp = useSpace();
    const { me, role, spaces, space, switchSpace, coreState } = sp;
    const { name } = useTenant();
    const { signOut, leaveDemo, demo } = useAuth();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { home, groups } = useNav();
    const [q, setQ] = useState("");
    const [notif, setNotif] = useState(false);
    const [companion, setCompanion] = useState(false);
    const [more, setMore] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);
    // Home's chat sheet sits under the sticky header for the rest of the
    // viewport, so the header's real height (it grows with the demo banner and
    // the child's band) is published as a CSS variable.
    const headerRef = useRef<HTMLElement>(null);
    const [headerH, setHeaderH] = useState(76);
    useEffect(() => {
        const el = headerRef.current;
        if (!el) return;
        const measure = () => setHeaderH(el.offsetHeight);
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    const isHome = pathname === "/";

    const child = role === "child";
    const first = me.name.split(" ")[0];
    const unread = coreState.notifications.filter((n) => n.memberId === me.id && !n.readAt).length;

    // New page: top of it, and the transient panels closed. The companion stays —
    // it is a side panel you talk to while moving around.
    useEffect(() => {
        window.scrollTo({ top: 0 });
        setNotif(false);
        setMore(false);
    }, [pathname]);

    // "/" focuses search (unless you are already typing somewhere).
    useEffect(() => {
        const onKey = (e: globalThis.KeyboardEvent) => {
            if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
            const t = e.target as HTMLElement | null;
            if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
            e.preventDefault();
            searchRef.current?.focus();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const goSearch = (e: FormEvent) => {
        e.preventDefault();
        const term = q.trim();
        if (!term) return;
        setMore(false);
        navigate(`/search?q=${encodeURIComponent(term)}`);
    };
    const logout = async () => {
        if (demo) leaveDemo();
        else await signOut();
        navigate("/login", { replace: true });
    };

    const bell = (
        <span className="relative">
            <IconButton label={`Notifications${unread ? `, ${unread} unread` : ""}`} onClick={() => setNotif(true)} aria-expanded={notif} aria-haspopup="dialog">
                <Bell size={18} strokeWidth={1.8} />
            </IconButton>
            {unread > 0 && (
                <span className="pointer-events-none absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full border-2 border-card bg-danger px-1 text-[10px] font-bold leading-4 text-white" aria-hidden="true">
                    {unread > 9 ? "9+" : unread}
                </span>
            )}
        </span>
    );

    const searchForm = (className?: string) => (
        <form
            role="search"
            onSubmit={goSearch}
            className={cn(
                "flex h-[46px] items-center gap-2.5 rounded-full border border-line-strong bg-card px-4 text-md transition-shadow focus-within:border-brand focus-within:shadow-[0_0_0_3px_var(--color-brand-soft)] max-md:h-12 max-md:rounded-md",
                className,
            )}
        >
            <Search size={18} strokeWidth={1.8} aria-hidden="true" />
            <input ref={searchRef} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={child ? "Search…" : "Search the family…"} aria-label={`Search ${name}`} className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-caption" />
            {!child && (
                <span className="max-lg:hidden" aria-hidden="true">
                    <Kbd>/</Kbd>
                </span>
            )}
        </form>
    );

    return (
        <div className="grid-cols-[minmax(0,1fr)] min-h-dvh bg-page md:grid md:grid-cols-[260px_minmax(0,1fr)]">
            {/* Sidebar */}
            <aside className="hidden h-dvh flex-col md:sticky md:top-0 md:flex" aria-label="Sidebar">
                <div className="px-4 pb-3 pt-5">
                    <Link to="/" aria-label={`${name} — home`} className="inline-flex rounded-sm">
                        <Wordmark name={name} size={28} />
                    </Link>
                    {spaces.length > 1 && (
                        <label className="mt-4 block">
                            <span className="mb-1 block text-2xs font-semibold uppercase tracking-[0.1em] text-caption">Family</span>
                            <span className="relative block">
                                <select value={space.id} onChange={(e) => switchSpace(e.target.value)} className="h-9 w-full appearance-none rounded-md border border-line-strong bg-card pl-3 pr-8 text-sm font-medium shadow-xs outline-none focus:border-brand focus:ring-4 focus:ring-brand-glow">
                                    {spaces.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
                            </span>
                        </label>
                    )}
                </div>
                <nav className="wf-fade-y min-h-0 flex-1 overflow-y-auto px-3 pb-6 pt-1" aria-label="Primary">
                    <NavGroups home={home} groups={groups} big={child} />
                </nav>
                <div className="p-3">
                    <Link to="/family/settings" className="flex items-center gap-3 rounded-sm px-2 py-2 transition-colors hover:bg-subtle" aria-label="Your profile and family settings">
                        <MemberAvatar member={me} size="md" />
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-md font-semibold">{me.name}</span>
                            <span className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                                {me.relation}
                                {child && <Points n={me.points} />}
                            </span>
                        </span>
                        <Settings size={16} className="shrink-0 text-caption" aria-hidden="true" />
                    </Link>
                    <button type="button" onClick={() => void logout()} className="mt-1 flex w-full items-center gap-3 rounded-sm px-2 py-2 text-sm font-medium text-muted transition-colors hover:bg-subtle hover:text-danger-ink">
                        <LogOut size={16} aria-hidden="true" />
                        {sp.kind === "demo" ? "Exit demo" : "Sign out"}
                    </button>
                </div>
            </aside>

            {/* Main column */}
            <div className="flex min-w-0 flex-col" style={{ "--wf-header": `${headerH}px` } as CSSProperties}>
                <header ref={headerRef} className="sticky top-0 z-20 bg-page/85 backdrop-blur">
                    {/* Desktop topbar */}
                    <div className="hidden h-[76px] items-center gap-3 px-8 md:flex">
                        {searchForm("w-full max-w-[520px]")}
                        <div className="ml-auto flex items-center gap-3">
                            {bell}
                            <Button variant="brand" size="lg" onClick={() => setCompanion(true)} aria-expanded={companion} aria-haspopup="dialog">
                                <Sparkles size={16} aria-hidden="true" /> Ask Wàfè
                            </Button>
                        </div>
                    </div>
                    {/* Mobile app bar */}
                    <div className="flex h-[60px] items-center gap-3 px-5 md:hidden">
                        <Link to="/family/settings" aria-label="Your profile">
                            <MemberAvatar member={me} size="md" />
                        </Link>
                        <div className="min-w-0 flex-1">
                            {child ? (
                                <div className="truncate font-display text-[19px] leading-6">Hi {first} 👋</div>
                            ) : (
                                <>
                                    <div className="text-xs leading-4 text-muted">{greeting()},</div>
                                    <div className="truncate text-[17px] font-semibold leading-5">{first}</div>
                                </>
                            )}
                        </div>
                        {child && <Points n={me.points} />}
                        {bell}
                    </div>
                    {/* The child's band: a warm hello and their points, every page. */}
                    {child && (
                        <div className="hidden items-center gap-3 bg-brand-soft px-8 py-2 text-brand-ink md:flex">
                            <span className="font-display text-xl">Hi {first} 👋</span>
                            <span className="text-sm text-muted">{greeting()}. Let's see what today holds.</span>
                            <Points n={me.points} className="ml-auto" />
                        </div>
                    )}
                    {sp.kind === "demo" && <DemoBanner />}
                </header>

                {/* Home runs edge to edge — its chat sheet meets the header and the
                    right edge, as the design does; every other page keeps the gutter. */}
                <main id="main" className={isHome ? "flex-1 pb-28 md:pb-0" : "flex-1 px-5 pb-28 pt-5 md:px-8 md:pb-12 md:pt-7"}>
                    <div className={isHome ? "w-full" : "mx-auto w-full max-w-[1180px]"}>
                        <Outlet />
                    </div>
                </main>
            </div>

            {/* Phone: companion button above the tab bar */}
            <button
                type="button"
                onClick={() => setCompanion(true)}
                aria-label="Ask Wàfè"
                aria-expanded={companion}
                aria-haspopup="dialog"
                className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] right-4 z-30 grid size-12 place-items-center rounded-full bg-brand text-white shadow-app transition-colors hover:bg-brand-hover md:hidden"
            >
                <Sparkles size={20} aria-hidden="true" />
            </button>

            {/* Phone: tab bar */}
            <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-line bg-card pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Primary">
                {TABS.map((t) => {
                    const Icon = AREA_ICON[t.area];
                    return (
                        <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => cn("flex flex-col items-center gap-1 pb-2 pt-2.5 text-2xs font-medium", child && "text-xs", isActive ? "text-brand" : "text-muted")}>
                            {({ isActive }) => (
                                <>
                                    <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
                                    {t.label}
                                    <span className={cn("block size-1 rounded-full", isActive ? DOT[t.area] : "bg-transparent")} aria-hidden="true" />
                                </>
                            )}
                        </NavLink>
                    );
                })}
                <button type="button" onClick={() => setMore(true)} aria-expanded={more} aria-haspopup="dialog" className={cn("flex flex-col items-center gap-1 pb-2 pt-2.5 text-2xs font-medium text-muted", child && "text-xs")}>
                    <LayoutGrid size={22} strokeWidth={1.8} aria-hidden="true" />
                    More
                    <span className="block size-1 rounded-full bg-transparent" aria-hidden="true" />
                </button>
            </nav>

            {/* Phone: the "More" sheet — everything, grouped */}
            <Dialog open={more} onClose={() => setMore(false)} title="Everything">
                <div className="mb-3">{searchForm()}</div>
                <nav aria-label="All modules" className="-mx-2">
                    <NavGroups home={home} groups={groups} big onNavigate={() => setMore(false)} />
                </nav>
                <div className="mt-4 border-t border-line pt-3">
                    <Link to="/family/settings" onClick={() => setMore(false)} className="flex items-center gap-3 rounded-md px-1 py-2.5 text-base font-medium hover:bg-page">
                        <Settings size={18} strokeWidth={1.8} aria-hidden="true" /> Settings
                    </Link>
                    <button type="button" onClick={() => void logout()} className="flex w-full items-center gap-3 rounded-md px-1 py-2.5 text-base font-medium text-danger-ink hover:bg-page">
                        <LogOut size={18} strokeWidth={1.8} aria-hidden="true" />
                        {sp.kind === "demo" ? "Exit demo" : "Sign out"}
                    </button>
                </div>
            </Dialog>

            <NotificationsDrawer open={notif} onClose={() => setNotif(false)} />
            <CompanionDrawer open={companion} onClose={() => setCompanion(false)} />
            <Toasts />
        </div>
    );
}
