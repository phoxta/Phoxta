import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Bell, BookOpen, Compass, LayoutGrid, LogOut, Mail, Menu, Rocket, Settings, Users, Search as SearchIcon, TrendingUp } from "lucide-react";
import { cn } from "@/lib/cn";
import { greeting, initials } from "@startup-school/core";
import { liveNow, openTasks, unreadMessages, unreadNotifications } from "@startup-school/core";
import { useNow } from "@/lib/useNow";
import { useAuth } from "@/state/auth";
import { useAccess } from "@/state/access";
import { useData } from "@/state/data";
import { useTenant } from "@/state/tenant";
import { useStaff } from "@/state/staff";
import { Avatar, Badge, IconButton, SearchBox, Sparkle } from "@/components/ui/primitives";
import { Toasts } from "@/components/ui/overlay";

/**
 * The three-pane console. Sidebar (navigate) · main (do) · right rail (track &
 * connect) — each column has one job.
 *
 * Two things never move on desktop: the sidebar is pinned to the viewport (the
 * wordmark stays put, the nav under it scrolls on its own when the window is
 * shorter than the list) and the toolbar — search, inbox, notifications, you —
 * stays at the top while the page scrolls under it. Below 768px it becomes the
 * native-app mode the design specifies: sticky app bar, single column, bottom
 * tab bar. Pages that want the right rail render it through `<WithRail>`; the
 * rest get the main column full width.
 */

/** Five founder jobs, instead of a flat list of every feature in the product. */
const WORKFLOWS = [
    { id: "home", to: "/", label: "Home", icon: LayoutGrid },
    { id: "learn", to: "/learn", label: "Learn", icon: BookOpen },
    { id: "build", to: "/build", label: "Build", icon: Rocket },
    { id: "connect", to: "/connect", label: "Connect", icon: Users },
    { id: "progress", to: "/progress", label: "Progress", icon: TrendingUp },
] as const;

const MOBILE_TABS = [
    ...WORKFLOWS.slice(0, 4),
    { id: "more", to: "/more", label: "More", icon: Menu },
] as const;

type WorkflowId = (typeof WORKFLOWS)[number]["id"] | "more";

function activeWorkflow(pathname: string): WorkflowId {
    if (pathname === "/") return "home";
    if (pathname.startsWith("/learn") || pathname.startsWith("/courses") || pathname.startsWith("/lessons") || pathname.startsWith("/room")) return "learn";
    if (pathname.startsWith("/build") || pathname.startsWith("/venture") || pathname.startsWith("/tasks") || pathname.startsWith("/adviser")) return "build";
    if (pathname.startsWith("/connect") || pathname.startsWith("/groups") || pathname.startsWith("/mentors") || pathname.startsWith("/sessions") || pathname.startsWith("/inbox")) return "connect";
    if (pathname.startsWith("/progress") || pathname.startsWith("/certificates")) return "progress";
    return "more";
}

const NAV_ITEM = "flex items-center gap-3 py-3.5 text-[17px] font-medium";

export function AppShell() {
    const { user, repo, catalogue } = useData();
    const { name } = useTenant();
    const { signOut } = useAuth();
    const { can } = useAccess();
    const { isStaff } = useStaff();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [q, setQ] = useState("");
    const [scrolled, setScrolled] = useState(false);
    const [isMentor, setIsMentor] = useState(false);
    const workspaceRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        workspaceRef.current?.scrollTo({ top: 0 });
        window.scrollTo({ top: 0 });
    }, [pathname]);

    // The desktop workspace, not the document, owns scrolling. Watch that
    // surface so the toolbar edge follows the content moving beneath it.
    useEffect(() => {
        const workspace = workspaceRef.current;
        if (!workspace) return;
        const on = () => setScrolled(workspace.scrollTop > 8);
        on();
        workspace.addEventListener("scroll", on, { passive: true });
        return () => workspace.removeEventListener("scroll", on);
    }, []);

    // The mentor console is an operator surface, not learner navigation. Ask
    // the repository rather than guessing from profile copy or a client role.
    useEffect(() => {
        let alive = true;
        void repo.myMentor().then((mentor) => {
            if (alive) setIsMentor(Boolean(mentor));
        }).catch(() => {
            if (alive) setIsMentor(false);
        });
        return () => {
            alive = false;
        };
    }, [repo]);

    // A class on right now is the one thing in the sidebar that is time-
    // sensitive, so it gets its own tick rather than waiting for a navigation.
    const onAir = Boolean(liveNow(catalogue, useNow(30000)));
    const inboxCount = unreadMessages(user);
    const taskCount = openTasks(user);
    // Confirmed and still ahead — a cancelled or past session is not a nudge.
    const sessionCount = user.bookings.filter((b) => b.status === "confirmed" && new Date(b.startsAt).getTime() >= Date.now()).length;
    // A guess with nothing that would settle it is the one thing on the venture
    // record worth nagging about; everything else there is just unwritten.
    const ventureTodo = Object.values(user.venture.sections)
        .flatMap((sec) => sec?.claims ?? [])
        .filter((c) => c.confidence !== "proven" && !c.test.trim()).length;
    const bellCount = unreadNotifications(user);
    const currentWorkflow = activeWorkflow(pathname);
    const goSearch = () => {
        if (q.trim()) navigate(`/courses?q=${encodeURIComponent(q.trim())}`);
    };
    const logout = async () => {
        await signOut();
        navigate("/login", { replace: true });
    };
    const workflows = WORKFLOWS.filter((item) => item.id !== "connect" || can("cohort"));
    const mobileTabs = MOBILE_TABS.filter((item) => item.id !== "connect" || can("cohort"));

    return (
        <div className="min-h-dvh bg-page md:grid md:h-dvh md:grid-cols-[216px_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)] md:gap-x-6 md:overflow-hidden xl:pr-8">
            {/* Mobile app bar */}
            <header className="sticky top-0 z-20 flex items-center gap-3 bg-page px-5 pb-2 pt-3.5 md:hidden">
                <Link to="/settings" aria-label="Your profile">
                    <Avatar name={user.profile.name} hue={user.profile.hue} src={user.profile.photoUrl} size="md" />
                </Link>
                <div className="min-w-0 flex-1">
                    <div className="text-[12px] text-muted">{greeting()} 🔥</div>
                    <div className="truncate text-[17px] font-semibold leading-tight">{user.profile.name}</div>
                </div>
                <Link to="/notifications" className="relative grid size-11 place-items-center rounded-full border border-line-strong bg-card" aria-label={`Notifications${bellCount ? `, ${bellCount} unread` : ""}`}>
                    <Bell size={18} strokeWidth={1.8} />
                    {bellCount > 0 && <span className="absolute right-[11px] top-[11px] size-[7px] rounded-full border-[1.5px] border-white bg-danger" />}
                </Link>
            </header>

            {/* Sidebar has its own internal overflow when its navigation is taller than the viewport. */}
            <aside className="hidden border-r border-line bg-card md:flex md:h-dvh md:flex-col" aria-label="Primary">
                {/* The wordmark never scrolls. */}
                <div className="shrink-0 px-9 pb-6 pt-9">
                    <Link to="/" className="flex items-center gap-3 text-[17px] font-semibold">
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand">
                            <Sparkle className="w-4" />
                        </span>
                        <span className="whitespace-nowrap">{name}</span>
                    </Link>
                </div>
                {/* Everything under it scrolls on its own when the window is short. */}
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-9 pb-11 pt-6">
                    <div className="mb-2.5 text-[11px] font-medium tracking-[0.08em] text-caption">YOUR WORKSPACE</div>
                    <nav className="flex flex-col">
                        {isStaff && <Link to="/staff" className={cn(NAV_ITEM,"text-brand")}><Users size={20} />Staff workspace</Link>}
                        <Link to="/programme" className={cn(NAV_ITEM,"text-ink")}><BookOpen size={20} />My programme</Link>
                        {workflows.map((n) => (
                            <Link key={n.id} to={n.to} aria-current={currentWorkflow === n.id ? "page" : undefined} className={cn(NAV_ITEM, currentWorkflow === n.id ? "text-brand" : "text-ink hover:text-brand")}>
                                <n.icon size={20} strokeWidth={1.8} aria-hidden="true" />
                                {n.label}
                                {n.id === "learn" && onAir && (
                                    <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-danger-soft px-2 py-1 text-[11px] font-semibold text-danger-ink">
                                        <span className="size-1.5 animate-pulse rounded-full bg-danger" aria-hidden="true" />
                                        Live
                                    </span>
                                )}
                                {n.id === "build" && (taskCount + ventureTodo) > 0 && <span className="ml-auto text-[12px] text-muted">{taskCount + ventureTodo}</span>}
                                {n.id === "connect" && (inboxCount + sessionCount) > 0 && <Badge className="ml-auto">{inboxCount + sessionCount}</Badge>}
                            </Link>
                        ))}
                    </nav>

                    <div className="mt-auto pt-6">
                        <div className="mb-2.5 text-[11px] font-medium tracking-[0.08em] text-caption">SETTINGS</div>
                        <NavLink to="/settings" className={({ isActive }) => cn(NAV_ITEM, isActive ? "text-brand" : "text-ink hover:text-brand")}>
                            <Settings size={20} strokeWidth={1.8} aria-hidden="true" />
                            Settings
                        </NavLink>
                        {isMentor && can("cohort") && (
                            <NavLink to="/mentoring" className={({ isActive }) => cn(NAV_ITEM, isActive ? "text-brand" : "text-ink hover:text-brand")}>
                                <Compass size={20} strokeWidth={1.8} aria-hidden="true" />
                                Mentor desk
                            </NavLink>
                        )}
                        <button type="button" onClick={() => void logout()} className={cn(NAV_ITEM, "text-danger-ink")}>
                            <LogOut size={20} strokeWidth={1.8} aria-hidden="true" />
                            Logout
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main + right rail */}
            <div ref={workspaceRef} className="min-w-0 pb-24 md:min-h-0 md:overflow-y-auto md:overscroll-contain md:pb-10">
                {/* Toolbar: pinned, so search / inbox / notifications / you are one
                    click away however far down the page you are. Its height is
                    --cs-topbar-h in index.css; other sticky things sit below it. */}
                <div className={cn("sticky top-0 z-20 mb-3 hidden items-center gap-4 bg-page pb-4 pt-[30px] transition-shadow md:flex", scrolled && "shadow-[0_10px_18px_-14px_rgba(27,27,35,0.35)]")}>
                    <SearchBox value={q} onChange={setQ} onSubmit={goSearch} placeholder="Search courses" className="max-w-[720px] flex-1" />
                    <div className="ml-auto flex items-center gap-4">
                        <Link to="/inbox" className="relative" aria-label={`Inbox${inboxCount ? `, ${inboxCount} unread` : ""}`}>
                            <IconButton label="Inbox" dot={inboxCount > 0} tabIndex={-1}>
                                <Mail size={18} strokeWidth={1.8} />
                            </IconButton>
                        </Link>
                        <Link to="/notifications" aria-label={`Notifications${bellCount ? `, ${bellCount} unread` : ""}`}>
                            <IconButton label="Notifications" dot={bellCount > 0} tabIndex={-1}>
                                <Bell size={18} strokeWidth={1.8} />
                            </IconButton>
                        </Link>
                        <span className="h-[30px] w-px bg-line-strong" aria-hidden="true" />
                        <Link to="/settings" className="flex items-center gap-3 text-[17px] font-medium">
                            <Avatar name={user.profile.name} hue={user.profile.hue} src={user.profile.photoUrl} size="md" />
                            <span className="max-lg:hidden">{user.profile.name}</span>
                        </Link>
                    </div>
                </div>
                <div className="px-5 md:px-0">
                    <div className="mb-4 md:hidden">
                        <SearchBox value={q} onChange={setQ} onSubmit={goSearch} placeholder="Search courses" />
                    </div>
                    <Outlet />
                </div>
            </div>

            {/* Mobile tab bar */}
            <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-line bg-card px-2 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2.5 md:hidden" aria-label="Primary">
                {mobileTabs.map((t) => (
                    <Link key={t.id} to={t.to} aria-current={currentWorkflow === t.id ? "page" : undefined} className={cn("flex min-w-14 flex-col items-center gap-1 text-[11px] font-medium", currentWorkflow === t.id ? "text-brand" : "text-muted")}>
                        {(() => {
                            const isActive = currentWorkflow === t.id;
                            return (
                            <>
                                <span className="relative">
                                    <t.icon size={22} strokeWidth={1.8} aria-hidden="true" />
                                    {t.id === "connect" && inboxCount > 0 && <span className="absolute -right-1 -top-1 size-2 rounded-full bg-danger" />}
                                    {t.id === "learn" && onAir && <span className="absolute -right-1 -top-1 size-2 animate-pulse rounded-full bg-danger" />}
                                </span>
                                {t.label}
                                <i className={cn("block size-1 rounded-full", isActive ? "bg-brand" : "bg-transparent")} aria-hidden="true" />
                            </>
                            );
                        })()}
                    </Link>
                ))}
            </nav>
            <Toasts />
        </div>
    );
}

/** Two-column page body: main content + the 340px right rail (stacks on mobile).
 *  `grid-cols-1` matters: an implicit auto column sizes to its content's
 *  min-content, and a nowrap row inside would push the page wider than a phone. */
export function WithRail({ children, rail }: { children: ReactNode; rail: ReactNode }) {
    return (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0">{children}</div>
            <aside className="min-w-0">{rail}</aside>
        </div>
    );
}

export function PageTitle({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
    return (
        <div className="mb-6 flex items-end gap-4">
            <div className="min-w-0 flex-1">
                <h1 className="text-[22px] font-semibold leading-7">{title}</h1>
                {sub && <p className="mt-1 text-[14px] text-muted">{sub}</p>}
            </div>
            {action}
        </div>
    );
}

export function SearchIconInline() {
    return <SearchIcon size={18} strokeWidth={1.8} aria-hidden="true" />;
}

export function initialsOf(name: string): string {
    return initials(name);
}
