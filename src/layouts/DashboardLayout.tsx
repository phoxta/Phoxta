import { useEffect, useRef, useState } from "react";
import { isPlatformAdmin } from "@/lib/db/platform";
import { Link, useLocation, useNavigate } from "react-router-dom";
import NoIndex from "@/seo/NoIndex";
import { useAuth } from "@/auth/AuthProvider";
import KeepAliveOutlet from "@/layouts/KeepAliveOutlet";
import { preloadRoute } from "@/pages/dashboard/preload";
import { warmDashboard } from "@/lib/cache/warmDashboard";
import "@/styles/dashboard-theme.css";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type Notification,
} from "@/lib/db/collaboration";

type NavItem = {
  to: string;
  label: string;
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

const NAV: NavItem[] = [
  { to: "/dashboard", end: true, label: "Home" },
  {
    to: "/dashboard/console", label: "Console",
    activeWhen: (p) => p === "/dashboard/console" || isOpsConsole(p),
  },
  { to: "/dashboard/studio", label: "Studio" },
  { to: "/dashboard/marketplace", label: "Marketplace" },
  {
    to: "/dashboard/businesses", label: "Businesses",
    activeWhen: (p) => p.startsWith("/dashboard/businesses") && !isOpsConsole(p),
  },
  { to: "/dashboard/billing", label: "Billing" },
  // Phoxta's own operating console. Hidden unless the signed-in user is on the
  // platform_admins roster — the RPCs behind it enforce that server-side too, so
  // hiding the link is presentation, not the control.
  { to: "/dashboard/platform", label: "Platform", platformOnly: true },
];

const SETTINGS_PATH = "/dashboard/settings";

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
    <div className="hrx">
      <NoIndex />

      <header className="hrx-nav position-relative">
        <div className="hrx-nav-left">
          <button type="button" className="btn btn-link p-0 d-lg-none" style={{ color: "#272727" }} aria-label="Open menu" onClick={() => setOpen((v) => !v)}>
            {MENU_ICON}
          </button>
          <Link to="/dashboard" className="hrx-logo">
            {CUBE_LOGO}
            <b className="d-none d-sm-inline">Phoxta</b>
          </Link>
          <nav className="hrx-tabs d-none d-lg-flex" aria-label="Dashboard">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onMouseEnter={() => preloadRoute(item.to)}
                aria-current={navActive(item, pathname) ? "page" : undefined}
                className={`hrx-tab${navActive(item, pathname) ? " active" : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hrx-nav-right">
          <form className="hrx-search d-none d-xl-flex" role="search" onSubmit={submitSearch}>
            {SEARCH_ICON}
            <label className="visually-hidden" htmlFor="hrx-q">Search the marketplace</label>
            <input id="hrx-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search everything..." />
          </form>

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
              {[...navItems, { to: SETTINGS_PATH, label: "Settings" } as NavItem].map((item) => (
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
    </div>
  );
}
