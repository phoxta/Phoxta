import { useEffect, useRef, useState, type ReactNode } from "react";
import { isPlatformAdmin } from "@/lib/db/platform";
import { Link, useLocation, useNavigate } from "react-router-dom";
import NoIndex from "@/seo/NoIndex";
import { useAuth } from "@/auth/AuthProvider";
import KeepAliveOutlet from "@/layouts/KeepAliveOutlet";
import CommandBar from "@/components/dash/CommandBar";
import { preloadRoute } from "@/pages/dashboard/preload";
import { warmDashboard } from "@/lib/cache/warmDashboard";
import "@/styles/dashboard-theme.css";
import "@/styles/opportunity-console.css";
import { BookOpen, Compass, FolderOpen, Home } from 'lucide-react';
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type Notification,
} from "@/lib/db/collaboration";

type NavItem = {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
  platformOnly?: boolean;
  /** Overrides prefix matching where a page lives under someone else's path. */
  activeWhen?: (pathname: string) => boolean;
};

/** The operating console: /dashboard/businesses/:id/ops and anything beneath. */
const isOpsConsole = (p: string) => /^\/dashboard\/businesses\/[^/]+\/ops(\/|$)/.test(p);

/**
 * Which nav item a path belongs to.
 *
 * The operating console lives under /dashboard/businesses/:id/ops, so plain
 * prefix matching lit up Businesses while you were sitting in the Console —
 * and /dashboard/console is only a redirect into it, so Console never lit up at
 * all. The two items say where they actually apply instead.
 */
function navActive(item: NavItem, pathname: string): boolean {
  if (item.activeWhen) return item.activeWhen(pathname);
  if (item.end) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

const CUBE_LOGO = (
  <img width={36} height={36} src="/assets/imgs/template/logo/favicon.svg" alt="Phoxta" loading="lazy" />
);

const TODAY_ICON = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></svg>;
const RUN_ICON = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 4c3.1.5 5.5 2.9 6 6l-5.1 5.1-5.9-5.9L14 4Z" /><path d="m9 9-3.8.8L3 14l3.5 1.5L8 19l4.2-2.2M14.5 9.5h.01" /></svg>;
const BUSINESS_ICON = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9.5h16v10H4z" /><path d="M8 9.5V7a4 4 0 0 1 8 0v2.5M10 14h4" /></svg>;
const ACCOUNT_ICON = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.8-3.3 3.1-5 7-5s6.2 1.7 7 5" /></svg>;
const PLATFORM_ICON = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3 4 7.5l8 4.5 8-4.5L12 3Z" /><path d="m4 12 8 4.5 8-4.5M4 16.5 12 21l8-4.5" /></svg>;

const NAV: NavItem[] = [
  { to: '/app', end: true, label: 'Home', icon: <Home size={18} /> },
  { to: '/app/discover', label: 'Discover', icon: <Compass size={18} /> },
  { to: '/app/opportunities', label: 'Opportunities', icon: <FolderOpen size={18} /> },
  { to: '/app/school', label: 'School', icon: <BookOpen size={18} /> },
  { to: "/dashboard", end: true, label: "Operations", icon: TODAY_ICON },
  {
    to: "/dashboard/console", label: "Run", icon: RUN_ICON,
    activeWhen: (p) => p === "/dashboard/console" || isOpsConsole(p),
  },
  {
    to: "/dashboard/businesses", label: "Businesses", icon: BUSINESS_ICON,
    activeWhen: (p) => p.startsWith("/dashboard/businesses") && !isOpsConsole(p),
  },
  { to: "/dashboard/settings", label: "Account", icon: ACCOUNT_ICON },
  // Phoxta's own operating console. Hidden unless the signed-in user is on the
  // platform_admins roster — the RPCs behind it enforce that server-side too, so
  // hiding the link is presentation, not the control.
  { to: "/dashboard/platform", label: "Platform", icon: PLATFORM_ICON, platformOnly: true },
];

const SETTINGS_PATH = "/dashboard/settings";

/** Which modifier the command-bar shortcut hint should advertise. */
const IS_MAC = typeof navigator !== "undefined" && /Mac|iP(hone|ad|od)/.test(navigator.platform);

// The top-level nav pages are all param-free, so they're kept mounted (via <Activity>)
// after their first visit — instant revisits with preserved scroll + in-page state.
const KEEP_ALIVE_PATHS = [...NAV.filter((i) => !i.platformOnly).map((item) => item.to), SETTINGS_PATH];

const MENU_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M3 6h18M3 12h18M3 18h18" />
  </svg>
);

const SEARCH_ICON = (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
    <path d="M14.5 14.5a6.8 6.8 0 1 0-9.6-9.6 6.8 6.8 0 0 0 9.6 9.6Zm0 0 2.6 2.6" />
  </svg>
);

const BELL_ICON = (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5.6 8.3a4.4 4.4 0 0 1 8.8 0v2.6c0 .6.2 1.2.6 1.7l.7 1c.4.6 0 1.4-.7 1.4H5a.9.9 0 0 1-.7-1.4l.7-1c.4-.5.6-1.1.6-1.7V8.3Z" />
    <path d="M8.2 15.8a1.9 1.9 0 0 0 3.6 0" />
  </svg>
);

const GEAR_ICON = (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="10" cy="10" r="2.5" />
    <path d="M8.6 2.5h2.8l.5 2 1.4.8 2-.7 1.4 2.4-1.5 1.4v1.6l1.5 1.4-1.4 2.4-2-.7-1.4.8-.5 2H8.6l-.5-2-1.4-.8-2 .7-1.4-2.4 1.5-1.4V8.4L3.3 7l1.4-2.4 2 .7 1.4-.8.5-2Z" />
  </svg>
);

export default function DashboardLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  // ProtectedRoute guarantees the session + completed onboarding before this
  // layout mounts, so we render immediately (no second onboarding fetch here).
  const [ready] = useState(true);
  const [notes, setNotes] = useState<Notification[]>([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [q, setQ] = useState("");
  const [cmdOpen, setCmdOpen] = useState(false);
  // Platform console is admin-only. This hides the link; app_is_platform_admin()
  // guards the data, so a hand-typed URL still gets nothing.
  const [platformAdmin, setPlatformAdmin] = useState(false);
  useEffect(() => {
    let active = true;
    isPlatformAdmin().then((ok) => { if (active) setPlatformAdmin(ok); }).catch(() => { /* not an admin */ });
    return () => { active = false; };
  }, []);
  const { pathname } = useLocation();
  const navItems = NAV.filter((i) => !i.platformOnly || platformAdmin);
  const unread = notes.filter((n) => !n.read).length;

  useEffect(() => {
    if (!ready) return;
    let active = true;
    listNotifications().then(({ data }) => {
      if (active) setNotes(data);
    });
    return () => {
      active = false;
    };
  }, [ready]);

  async function openNote(n: Notification) {
    setBellOpen(false);
    if (!n.read) {
      setNotes((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      markNotificationRead(n.id);
    }
    if (n.link) navigate(n.link);
  }

  async function readAll() {
    setNotes((list) => list.map((x) => ({ ...x, read: true })));
    markAllNotificationsRead();
  }

  // Ctrl+K / Cmd+K toggles the command bar from anywhere in the dashboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Preload the whole dashboard the moment the shell mounts after sign-in — every nav
  // page's DATA + JS CHUNK — so the first click on any page is instant. It starts
  // immediately (not on idle) but runs through a concurrency pool, so it's a steady
  // stream of requests, never a stampede. Re-runs if the signed-in user changes.
  useEffect(() => {
    warmDashboard(user?.id ?? null);
  }, [user?.id]);

  // App-shell scroll containment: the dashboard is a fixed 100vh stage with its own
  // scrollable main column, so the document itself must NOT scroll. Lock body/html
  // overflow while mounted — and clear any height ScrollSmoother left behind when
  // arriving from a marketing page — so the background never scrolls; only the inner
  // content does. Everything is restored on exit (back to the marketing site).
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = { ho: html.style.overflow, bo: body.style.overflow, hh: html.style.height, bh: body.style.height };
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.height = "";
    body.style.height = "";
    return () => {
      html.style.overflow = prev.ho;
      body.style.overflow = prev.bo;
      html.style.height = prev.hh;
      body.style.height = prev.bh;
    };
  }, []);

  async function handleSignOut() {
    await signOut();
    navigate("/auth", { replace: true });
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/dashboard/marketplace?q=${encodeURIComponent(term)}` : "/dashboard/marketplace");
    setQ("");
  }

  const initials = (user?.email ?? "?").slice(0, 2).toUpperCase();
  const today = new Date().toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" });

  if (!ready) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: "100vh", background: "#fcfeff" }}>
        <div className="spinner-border text-dark" role="status" aria-label="Loading">
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="hrx hrx-workspace p2-console">
      <NoIndex />

      <aside className="hrx-sidebar d-none d-lg-flex" aria-label="Primary navigation">
        <Link to="/app" className="hrx-sidebar-brand">
          <span className="hrx-sidebar-logo">{CUBE_LOGO}</span>
          <span>
            <b>Phoxta</b>
            <small>OPERATING APP</small>
          </span>
        </Link>
        <span className="hrx-sidebar-label">WORKSPACE</span>
        <nav className="hrx-tabs" aria-label="Dashboard">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onMouseEnter={() => preloadRoute(item.to)}
              aria-current={navActive(item, pathname) ? "page" : undefined}
              className={`hrx-tab${navActive(item, pathname) ? " active" : ""}`}
            >
              <span className="hrx-nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hrx-sidebar-grow">
          <Link to="/dashboard/marketplace" className="hrx-sidebar-action">
            <span aria-hidden="true">+</span>
            Add a business
          </Link>
        </div>
        <div className="hrx-sidebar-bottom">
          <Link to="/" className="hrx-sidebar-site">View Phoxta site <span aria-hidden="true">↗</span></Link>
        </div>
      </aside>

      <header className="hrx-nav position-relative">
        <div className="hrx-nav-left d-lg-none">
          <button type="button" className="btn btn-link p-0 d-lg-none" style={{ color: "#272727" }} aria-label="Open menu" onClick={() => setOpen((v) => !v)}>
            {MENU_ICON}
          </button>
          <Link to="/dashboard" className="hrx-logo">
            {CUBE_LOGO}
            <b className="d-none d-sm-inline">Phoxta</b>
          </Link>
        </div>

        <div className="hrx-nav-right">
          <form className="hrx-search d-none d-lg-flex" role="search" onSubmit={submitSearch}>
            {SEARCH_ICON}
            <label className="visually-hidden" htmlFor="hrx-q">Search the marketplace</label>
            <input id="hrx-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search everything..." />
            <button
              type="button"
              onClick={() => setCmdOpen(true)}
              aria-label="Open command bar"
              title={`Command bar (${IS_MAC ? "⌘" : "Ctrl+"}K)`}
              style={{
                flexShrink: 0,
                border: "1px solid rgba(209, 216, 224, 0.55)",
                borderRadius: 6,
                background: "#fff",
                color: "#6b7280",
                fontSize: 11,
                fontWeight: 600,
                lineHeight: "16px",
                padding: "1px 6px",
                whiteSpace: "nowrap",
                cursor: "pointer",
              }}
            >
              {IS_MAC ? "⌘K" : "Ctrl K"}
            </button>
          </form>

          <Link to="/dashboard/marketplace" className="hrx-top-action d-none d-lg-inline-flex">
            <span aria-hidden="true">+</span>
            Add business
          </Link>

          <div className="position-relative">
            <button type="button" className="hrx-notif" aria-label="Notifications" onClick={() => setBellOpen((v) => !v)}>
              <span className="hrx-bell">{BELL_ICON}</span>
              <span className="hrx-notif-date d-none d-md-inline">{today}</span>
              {unread > 0 && <span className="hrx-badge">{unread > 9 ? "9+" : unread}</span>}
            </button>

            {bellOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close notifications"
                  className="position-fixed top-0 start-0 w-100 h-100 border-0 bg-transparent"
                  style={{ zIndex: 1050 }}
                  onClick={() => setBellOpen(false)}
                />
                <div className="hrx-pop" style={{ width: 320, maxHeight: 420, overflow: "auto" }}>
                  <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom">
                    <span className="fw-600 fz-font-md">Notifications</span>
                    {unread > 0 && (
                      <button type="button" className="btn btn-link btn-sm p-0 fz-font-sm text-decoration-none" onClick={readAll}>
                        Mark all read
                      </button>
                    )}
                  </div>
                  {notes.length === 0 ? (
                    <div className="px-3 py-4 text-center neutral-500 fz-font-md">You're all caught up.</div>
                  ) : (
                    <ul className="list-unstyled m-0">
                      {notes.map((n) => (
                        <li key={n.id}>
                          <button
                            type="button"
                            onClick={() => openNote(n)}
                            className={`w-100 text-start border-0 px-3 py-2 ${n.read ? "bg-neutral-0" : "bg-neutral-100"}`}
                          >
                            <div className="fw-600 fz-font-md neutral-900">{n.title}</div>
                            {n.body && <div className="fz-font-sm neutral-500">{n.body}</div>}
                            <div className="fz-font-sm neutral-500">{new Date(n.created_at).toLocaleDateString()}</div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>

          <Link
            to={SETTINGS_PATH}
            onMouseEnter={() => preloadRoute(SETTINGS_PATH)}
            className={`hrx-gear${pathname.startsWith(SETTINGS_PATH) ? " active" : ""}`}
            aria-label="Settings"
            aria-current={pathname.startsWith(SETTINGS_PATH) ? "page" : undefined}
          >
            {GEAR_ICON}
          </Link>

          <div className="position-relative">
            <button type="button" className="hrx-avatar" title={user?.email ?? "Account"} aria-label="Account menu" onClick={() => setUserOpen((v) => !v)}>
              {initials}
            </button>
            {userOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close account menu"
                  className="position-fixed top-0 start-0 w-100 h-100 border-0 bg-transparent"
                  style={{ zIndex: 1050 }}
                  onClick={() => setUserOpen(false)}
                />
                <div className="hrx-pop" style={{ width: 230 }}>
                  <div className="px-3 py-2 border-bottom fz-font-sm neutral-500 text-truncate">{user?.email}</div>
                  <Link to="/" className="d-block px-3 py-2 text-decoration-none fz-font-md" style={{ color: "#272727" }} onClick={() => setUserOpen(false)}>
                    Back to site
                  </Link>
                  <button type="button" className="w-100 text-start border-0 bg-transparent px-3 py-2 fz-font-md fw-600" style={{ color: "#fe5f2b" }} onClick={handleSignOut}>
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Mobile nav panel */}
        {open && (
          <>
            <button
              type="button"
              aria-label="Close menu"
              className="position-fixed top-0 start-0 w-100 h-100 border-0 d-lg-none"
              style={{ background: "rgba(0,0,0,.25)", zIndex: 1050 }}
              onClick={() => setOpen(false)}
            />
            <nav className="hrx-menu-panel d-lg-none" aria-label="Dashboard">
              {[...navItems, { to: SETTINGS_PATH, label: "Settings", icon: ACCOUNT_ICON } as NavItem].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  aria-current={navActive(item, pathname) ? "page" : undefined}
                  className={`hrx-tab${navActive(item, pathname) ? " active" : ""}`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </>
        )}
      </header>

      {/* The scroll container. `scrollRef` must stay on the element that actually
          scrolls — KeepAliveOutlet reads/writes its scrollTop to restore position. */}
      <div ref={scrollRef} className="hrx-scroll">
        <main className="hrx-main">
          <KeepAliveOutlet keepPaths={KEEP_ALIVE_PATHS} scrollContainerRef={scrollRef} />
        </main>
      </div>

      {/* Ctrl+K / Cmd+K — navItems is the same platform-gated list the tabs render. */}
      <CommandBar open={cmdOpen} onClose={() => setCmdOpen(false)} navItems={navItems} platformAdmin={platformAdmin} />
    </div>
  );
}
