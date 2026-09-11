import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Bell, BookOpen, CheckSquare, Compass, Inbox, LayoutGrid, LogOut, Mail, Settings, Users, Search as SearchIcon, TrendingUp } from "lucide-react";
import { cn } from "@/lib/cn";
import { greeting, initials } from "@/lib/format";
import { openTasks, unreadMessages, unreadNotifications } from "@/lib/derive";
import { useAuth } from "@/state/auth";
import { useData } from "@/state/data";
import { useTenant } from "@/state/tenant";
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

const NAV = [
    { to: "/", label: "Dashboard", icon: LayoutGrid, end: true },
    { to: "/inbox", label: "Inbox", icon: Inbox, badge: "inbox" as const },
    { to: "/lessons", label: "Lesson", icon: BookOpen },
    { to: "/tasks", label: "Task", icon: CheckSquare, badge: "tasks" as const },
    { to: "/groups", label: "Group", icon: Users },
    { to: "/courses", label: "Courses", icon: Compass },
    { to: "/progress", label: "Progress", icon: TrendingUp },
];

const TABS = [
    { to: "/", label: "Home", icon: LayoutGrid, end: true },
    { to: "/lessons", label: "Lesson", icon: BookOpen },
    { to: "/tasks", label: "Task", icon: CheckSquare },
    { to: "/groups", label: "Group", icon: Users },
    { to: "/inbox", label: "Inbox", icon: Inbox },
];

const NAV_ITEM = "flex items-center gap-3 py-3.5 text-[17px] font-medium";

export function AppShell() {
    const { user, repo } = useData();
    const { name } = useTenant();
    const { signOut, leaveDemo, demo } = useAuth();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [q, setQ] = useState("");
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        window.scrollTo({ top: 0 });
    }, [pathname]);

    // The pinned toolbar grows a soft edge once content is moving under it.
    useEffect(() => {
        const on = () => setScrolled(window.scrollY > 8);
        on();
        window.addEventListener("scroll", on, { passive: true });
        return () => window.removeEventListener("scroll", on);
    }, []);

    const inboxCount = unreadMessages(user);
    const taskCount = openTasks(user);
    const bellCount = unreadNotifications(user);
    const goSearch = () => {
        if (q.trim()) navigate(`/courses?q=${encodeURIComponent(q.trim())}`);
    };
    const logout = async () => {
        if (demo) leaveDemo();
        else await signOut();
        navigate("/login", { replace: true });
    };

    return (
        <div className="min-h-dvh bg-page md:grid md:grid-cols-[216px_minmax(0,1fr)] md:gap-x-6 xl:pr-8">
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

            {/* Sidebar: pinned to the viewport for the whole page. */}
            <aside className="hidden border-r border-line bg-card md:sticky md:top-0 md:flex md:h-dvh md:flex-col" aria-label="Primary">
                {/* The wordmark never scrolls. */}
                <div className="shrink-0 px-9 pb-6 pt-9">
                    <Link to="/" className="flex items-center gap-3 text-[22px] font-semibold">
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand">
                            <Sparkle className="w-4" />
                        </span>
                        <span className="truncate">{name}</span>
                    </Link>
                </div>
                {/* Everything under it scrolls on its own when the window is short. */}
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-9 pb-11 pt-6">
                    <div className="mb-2.5 text-[11px] font-medium tracking-[0.08em] text-caption">OVERVIEW</div>
                    <nav className="flex flex-col">
                        {NAV.map((n) => (
                            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cn(NAV_ITEM, isActive ? "text-brand" : "text-ink hover:text-brand")}>
                                <n.icon size={20} strokeWidth={1.8} aria-hidden="true" />
                                {n.label}
                                {n.badge === "inbox" && inboxCount > 0 && <Badge className="ml-auto">{inboxCount}</Badge>}
                                {n.badge === "tasks" && taskCount > 0 && <span className="ml-auto text-[12px] text-muted">{taskCount}</span>}
                            </NavLink>
                        ))}
                    </nav>

                    <div className="mt-auto pt-6">
                        <div className="mb-2.5 text-[11px] font-medium tracking-[0.08em] text-caption">SETTINGS</div>
                        <NavLink to="/settings" className={({ isActive }) => cn(NAV_ITEM, isActive ? "text-brand" : "text-ink hover:text-brand")}>
                            <Settings size={20} strokeWidth={1.8} aria-hidden="true" />
                            Setting
                        </NavLink>
                        <button type="button" onClick={() => void logout()} className={cn(NAV_ITEM, "text-danger-ink")}>
                            <LogOut size={20} strokeWidth={1.8} aria-hidden="true" />
                            {demo ? "Exit demo" : "Logout"}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main + right rail */}
            <div className="min-w-0 pb-24 md:pb-10">
                {/* Toolbar: pinned, so search / inbox / notifications / you are one
                    click away however far down the page you are. Its height is
                    --cs-topbar-h in index.css; other sticky things sit below it. */}
                <div className={cn("sticky top-0 z-20 mb-3 hidden items-center gap-4 bg-page pb-4 pt-[30px] transition-shadow md:flex", scrolled && "shadow-[0_10px_18px_-14px_rgba(27,27,35,0.35)]")}>
                    <SearchBox value={q} onChange={setQ} onSubmit={goSearch} className="max-w-[720px] flex-1" />
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
                {demo && repo.kind === "demo" && (
                    <div className="mb-4 hidden items-center gap-3 rounded-lg bg-brand-soft px-4 py-2.5 text-[13px] text-brand-ink md:flex">
                        <span className="font-semibold">Demo</span>
                        You're exploring as Jason. Everything works and is kept in this browser.
                        <Link to="/signup" className="ml-auto font-semibold underline underline-offset-4">
                            Create your own account
                        </Link>
                    </div>
                )}
                <div className="px-5 md:px-0">
                    <div className="mb-4 md:hidden">
                        <SearchBox value={q} onChange={setQ} onSubmit={goSearch} />
                    </div>
                    <Outlet />
                </div>
            </div>

            {/* Mobile tab bar */}
            <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-line bg-card px-2 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2.5 md:hidden" aria-label="Primary">
                {TABS.map((t) => (
                    <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => cn("flex min-w-14 flex-col items-center gap-1 text-[11px] font-medium", isActive ? "text-brand" : "text-muted")}>
                        {({ isActive }) => (
                            <>
                                <span className="relative">
                                    <t.icon size={22} strokeWidth={1.8} aria-hidden="true" />
                                    {t.to === "/inbox" && inboxCount > 0 && <span className="absolute -right-1 -top-1 size-2 rounded-full bg-danger" />}
                                </span>
                                {t.label}
                                <i className={cn("block size-1 rounded-full", isActive ? "bg-brand" : "bg-transparent")} aria-hidden="true" />
                            </>
                        )}
                    </NavLink>
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
