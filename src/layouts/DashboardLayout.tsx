import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import NoIndex from "@/seo/NoIndex";
import { useAuth } from "@/auth/AuthProvider";
import KeepAliveOutlet from "@/layouts/KeepAliveOutlet";
import { preloadRoute } from "@/pages/dashboard/preload";
import { warmDashboard } from "@/lib/cache/warmDashboard";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type Notification,
} from "@/lib/db/collaboration";

type NavItem = { to: string; label: string; icon: React.ReactNode; end?: boolean };

const HERO_BG = "/assets/imgs/pages/bg-img-4.webp";

const Icon = ({ d }: { d: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const CUBE_LOGO = (
  <img width={26} height={28} src="/assets/imgs/template/logo/favicon.svg" alt="Phoxta" loading="lazy" />
);

const NAV: NavItem[] = [
  { to: "/dashboard", end: true, label: "Home", icon: <Icon d="M3 11l9-8 9 8M5 10v10h14V10" /> },
  { to: "/dashboard/assistant", label: "Assistant", icon: <Icon d="M12 3a4 4 0 014 4v1a4 4 0 01-4 4 4 4 0 01-4-4V7a4 4 0 014-4zM5 21v-1a7 7 0 0114 0v1M9 8h.01M15 8h.01" /> },
  { to: "/dashboard/studio", label: "Studio", icon: <Icon d="M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5zM2 2l7.586 7.586M11 13a2 2 0 100-4 2 2 0 000 4z" /> },
  { to: "/dashboard/marketplace", label: "Marketplace", icon: <Icon d="M3 9l1.5-5h15L21 9M4 9h16v11H4zM9 13h6" /> },
  { to: "/dashboard/businesses", label: "Businesses", icon: <Icon d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v.01M9 12v.01M9 15v.01" /> },
  { to: "/dashboard/billing", label: "Billing", icon: <Icon d="M2 7h20v10H2zM2 11h20M6 15h4" /> },
  { to: "/dashboard/network", label: "Network", icon: <Icon d="M16 21v-2a4 4 0 00-8 0v2M12 11a4 4 0 100-8 4 4 0 000 8M3 21v-1a4 4 0 014-4M21 21v-1a4 4 0 00-4-4" /> },
  { to: "/dashboard/settings", label: "Settings", icon: <Icon d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 13a7.9 7.9 0 000-2l2-1.5-2-3.5-2.4 1a8 8 0 00-1.7-1l-.4-2.5H10.1l-.4 2.5a8 8 0 00-1.7 1l-2.4-1-2 3.5L3.6 11a7.9 7.9 0 000 2l-2 1.5 2 3.5 2.4-1a8 8 0 001.7 1l.4 2.5h3.8l.4-2.5a8 8 0 001.7-1l2.4 1 2-3.5z" /> },
];

// The top-level nav pages are all param-free, so they're kept mounted (via <Activity>)
// after their first visit — instant revisits with preserved scroll + in-page state.
const KEEP_ALIVE_PATHS = NAV.map((item) => item.to);

const MENU_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M3 6h18M3 12h18M3 18h18" />
  </svg>
);

const BELL_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" />
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

  const initials = (user?.email ?? "?").slice(0, 2).toUpperCase();

  if (!ready) {
    return (
      <div
        className="d-flex align-items-center justify-content-center"
        style={{ minHeight: "100vh", backgroundImage: `url(${HERO_BG})`, backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="spinner-border text-white" role="status" aria-label="Loading">
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="phoxta-dash-stage position-relative d-flex align-items-center justify-content-center"
      style={{
        height: "100vh",
        overflow: "hidden",
        padding: "clamp(16px, 3vw, 52px) clamp(16px, 3vw, 52px) 0",
        backgroundColor: "#0a0a0c",
      }}
    >
      <NoIndex />
      {/* Blurred hero background */}
      <div
        aria-hidden="true"
        className="position-absolute top-0 start-0 w-100 h-100"
        style={{
          backgroundImage: `url(${HERO_BG})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(7px)",
          transform: "scale(1.08)",
          zIndex: 0,
        }}
      />
      {/* Black overlay */}
      <div
        aria-hidden="true"
        className="position-absolute top-0 start-0 w-100 h-100"
        style={{ background: "rgba(0,0,0,.55)", zIndex: 0 }}
      />

      {/* Floating app card (bright-grey canvas) */}
      <div
        className="bg-neutral-50 position-relative d-flex overflow-hidden w-100 h-100 p-2 p-lg-3 gap-2 gap-lg-3"
        style={{ borderRadius: "28px 28px 0 0", maxWidth: 1480, zIndex: 1, boxShadow: "0 24px 70px -24px rgba(0,0,0,.55)" }}
      >
        {/* Sidebar — white rounded panel */}
        <aside
          className={`phoxta-dash-sidebar bg-neutral-0 flex-column flex-shrink-0 ${open ? "d-flex" : "d-none d-lg-flex"}`}
          style={{ width: 258, borderRadius: 20 }}
        >
          <div className="d-flex align-items-center justify-content-between px-4 pt-4 pb-4">
            <Link to="/dashboard" className="d-inline-flex align-items-center gap-2 text-decoration-none">
              {CUBE_LOGO}
              <h6 className="fw-700 fz-20 mb-0 neutral-900">Phoxta</h6>
            </Link>
            <button type="button" className="btn btn-link p-0 neutral-500 d-lg-none" aria-label="Close menu" onClick={() => setOpen(false)}>
              ✕
            </button>
          </div>

          <nav className="px-4 flex-grow-1 overflow-auto">
            <ul className="list-unstyled m-0 d-flex flex-column gap-1">
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onMouseEnter={() => preloadRoute(item.to)}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `d-flex align-items-center gap-3 px-3 py-2 rounded-3 text-decoration-none fz-font-md fw-500 ${
                        isActive ? "bg-neutral-100 neutral-900" : "neutral-500 phoxta-dash-link"
                      }`
                    }
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* Sidebar footer: notifications, account, sign out */}
          <div className="px-4 pb-4 pt-3">
            <div className="d-flex align-items-center gap-2 px-1 mb-2">
              <div className="position-relative">
                <button
                  type="button"
                  className="d-inline-flex align-items-center justify-content-center rounded-circle border-100 bg-neutral-0 neutral-700 position-relative"
                  style={{ width: 38, height: 38 }}
                  aria-label="Notifications"
                  onClick={() => setBellOpen((v) => !v)}
                >
                  {BELL_ICON}
                  {unread > 0 && (
                    <span
                      className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                      style={{ fontSize: 10 }}
                    >
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
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
                    <div
                      className="position-absolute start-0 bg-neutral-0 rounded-4 border-100 shadow-sm"
                      style={{ bottom: "calc(100% + 10px)", width: 320, maxHeight: 420, overflow: "auto", zIndex: 1051 }}
                    >
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

              <span
                className="d-inline-flex align-items-center justify-content-center rounded-circle bg-neutral-900 text-white fw-700 fz-font-sm"
                style={{ width: 38, height: 38 }}
                title={user?.email ?? "Account"}
              >
                {initials}
              </span>

              <button
                type="button"
                className="btn btn-dark rounded-pill fw-600 fz-font-sm px-3 py-2 ms-auto"
                onClick={handleSignOut}
              >
                Sign Out
              </button>
            </div>

            <hr className="my-2 border-100" />

            <Link to="/" className="d-flex align-items-center gap-2 px-3 py-2 rounded-3 text-decoration-none neutral-500 fz-font-md phoxta-dash-link">
              <Icon d="M10 19l-7-7 7-7M3 12h18" />
              <span>Back to site</span>
            </Link>
          </div>
        </aside>

        {/* Backdrop (mobile) */}
        {open && (
          <button
            type="button"
            aria-label="Close menu"
            className="position-fixed top-0 start-0 w-100 h-100 border-0 d-lg-none"
            style={{ background: "rgba(0,0,0,.35)", zIndex: 1040 }}
            onClick={() => setOpen(false)}
          />
        )}

        {/* Main column (scrolls inside the card) */}
        <div ref={scrollRef} className="flex-grow-1 d-flex flex-column" style={{ minWidth: 0, overflow: "auto" }}>
          {/* Mobile-only top bar */}
          <div className="d-flex d-lg-none align-items-center gap-2 px-3 py-3 border-bottom sticky-top bg-neutral-0">
            <button type="button" className="btn btn-link p-0 neutral-700" aria-label="Open menu" onClick={() => setOpen(true)}>
              {MENU_ICON}
            </button>
            <Link to="/dashboard" className="d-inline-flex align-items-center gap-2 text-decoration-none ms-1">
              {CUBE_LOGO}
              <h6 className="fw-700 fz-18 mb-0 neutral-900">Phoxta</h6>
            </Link>
          </div>

          <main className="px-3 px-lg-4 px-xl-5 py-4 flex-grow-1">
            <KeepAliveOutlet keepPaths={KEEP_ALIVE_PATHS} scrollContainerRef={scrollRef} />
          </main>
        </div>
      </div>
    </div>
  );
}
