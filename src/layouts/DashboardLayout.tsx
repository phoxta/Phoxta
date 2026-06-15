import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { getMyProfile } from "@/lib/db/profile";

type NavItem = { to: string; label: string; icon: React.ReactNode; end?: boolean };

const Icon = ({ d }: { d: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const NAV: NavItem[] = [
  { to: "/dashboard", end: true, label: "Home", icon: <Icon d="M3 11l9-8 9 8M5 10v10h14V10" /> },
  { to: "/dashboard/marketplace", label: "Marketplace", icon: <Icon d="M3 9l1.5-5h15L21 9M4 9h16v11H4zM9 13h6" /> },
  { to: "/dashboard/businesses", label: "Businesses", icon: <Icon d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v.01M9 12v.01M9 15v.01" /> },
  { to: "/dashboard/billing", label: "Billing", icon: <Icon d="M2 7h20v10H2zM2 11h20M6 15h4" /> },
  { to: "/dashboard/network", label: "Network", icon: <Icon d="M16 21v-2a4 4 0 00-8 0v2M12 11a4 4 0 100-8 4 4 0 000 8M3 21v-1a4 4 0 014-4M21 21v-1a4 4 0 00-4-4" /> },
  { to: "/dashboard/settings", label: "Settings", icon: <Icon d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 13a7.9 7.9 0 000-2l2-1.5-2-3.5-2.4 1a8 8 0 00-1.7-1l-.4-2.5H10.1l-.4 2.5a8 8 0 00-1.7 1l-2.4-1-2 3.5L3.6 11a7.9 7.9 0 000 2l-2 1.5 2 3.5 2.4-1a8 8 0 001.7 1l.4 2.5h3.8l.4-2.5a8 8 0 001.7-1l2.4 1 2-3.5z" /> },
];

const MENU_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M3 6h18M3 12h18M3 18h18" />
  </svg>
);

export default function DashboardLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  // Onboarding gate: first-run users finish setup before entering the dashboard.
  useEffect(() => {
    let active = true;
    getMyProfile().then(({ data }) => {
      if (!active) return;
      if (!data || !data.onboarding_completed) navigate("/onboarding", { replace: true });
      else setReady(true);
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  async function handleSignOut() {
    await signOut();
    navigate("/auth", { replace: true });
  }

  const initials = (user?.email ?? "?").slice(0, 2).toUpperCase();

  if (!ready) {
    return (
      <div className="d-flex align-items-center justify-content-center bg-neutral-50" style={{ minHeight: "100vh" }}>
        <div className="spinner-border text-dark" role="status" aria-label="Loading">
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex bg-neutral-50" style={{ minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside
        className={`px-blur-bottom phoxta-dash-sidebar bg-neutral-0 border-end flex-column flex-shrink-0 ${open ? "d-flex" : "d-none d-lg-flex"}`}
        style={{ width: 256, position: "sticky", top: 0, height: "100vh" }}
      >
        <div className="d-flex align-items-center justify-content-between px-4 py-4">
          <Link to="/dashboard" className="d-inline-flex align-items-center gap-2 text-decoration-none">
            <img width={26} height={26} src="/assets/imgs/template/logo/favicon.svg" alt="Phoxta" loading="lazy" />
            <h6 className="fw-700 fz-20 mb-0">Phoxta</h6>
          </Link>
          <button type="button" className="btn btn-link p-0 neutral-500 d-lg-none" aria-label="Close menu" onClick={() => setOpen(false)}>
            ✕
          </button>
        </div>

        <nav className="px-3 flex-grow-1 overflow-auto">
          <ul className="list-unstyled m-0 d-flex flex-column gap-1">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
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

        <div className="p-3 border-top">
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

      {/* Main column */}
      <div className="flex-grow-1 d-flex flex-column" style={{ minWidth: 0 }}>
        <header className="d-flex align-items-center gap-3 px-4 py-3 bg-neutral-0 border-bottom sticky-top">
          <button type="button" className="btn btn-link p-0 neutral-700 d-lg-none" aria-label="Open menu" onClick={() => setOpen(true)}>
            {MENU_ICON}
          </button>
          <div className="ms-auto d-flex align-items-center gap-3">
            <div className="text-end d-none d-sm-block">
              <div className="fz-font-md fw-600 neutral-900 lh-1">{user?.email ?? "Account"}</div>
              <div className="fz-font-sm neutral-500">Signed in</div>
            </div>
            <span
              className="d-inline-flex align-items-center justify-content-center rounded-circle bg-neutral-900 text-white fw-700 fz-font-sm"
              style={{ width: 38, height: 38 }}
            >
              {initials}
            </span>
            <button type="button" className="at-btn" onClick={handleSignOut}>
              <span>
                <span className="text-1">Sign out</span>
                <span className="text-2">Sign out</span>
              </span>
            </button>
          </div>
        </header>

        <main className="p-4 p-xl-5 flex-grow-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
