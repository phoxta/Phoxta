import { NavLink, Link, Navigate, Outlet } from "react-router-dom";
import {
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  LifeBuoy,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useStaff } from "@/state/staff";
import { useAuth } from "@/state/auth";
import { useAccess } from "@/state/access";
import { ROLE_LABELS } from "@/lib/staff";
import { Notice, ActionButton } from "@/components/staff/StaffUI";

export default function StaffShell() {
  const { ready, isStaff, can, assignments, error, refresh } = useStaff();
  const { session, signOut } = useAuth();
  const { plan } = useAccess();
  if (!ready)
    return (
      <div className="p-8" role="status">
        Checking staff access…
      </div>
    );
  if (error)
    return (
      <div className="mx-auto max-w-lg space-y-4 p-8">
        <Notice error>{error}</Notice>
        <ActionButton action={refresh}>Retry</ActionButton>
        <Link to="/pricing">Back to pricing</Link>
      </div>
    );
  if (!isStaff) return <Navigate to="/pricing" replace />;
  const nav = [
    { to: "/staff", label: "Overview", icon: LayoutDashboard, show: true },
    {
      to: "/staff/teaching",
      label: "Teaching",
      icon: CalendarDays,
      show: can("teaching") || can("mentoring"),
    },
    {
      to: "/staff/content",
      label: "Content",
      icon: BookOpen,
      show: can("content"),
    },
    {
      to: "/staff/people",
      label: "People",
      icon: Users,
      show: can("people") || can("invite"),
    },
    {
      to: "/staff/operations",
      label: "Operations",
      icon: Settings2,
      show:
        can("operations") || can("finance") || can("launch") || can("settings"),
    },
    {
      to: "/staff/support",
      label: "Support",
      icon: LifeBuoy,
      show: can("support"),
    },
    { to: "/staff/security", label: "Security", icon: ShieldCheck, show: true },
  ].filter((item) => item.show);
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-page lg:flex-row">
      <aside className="shrink-0 border-b border-line bg-white p-4 lg:flex lg:w-60 lg:flex-col lg:border-b-0 lg:border-r lg:p-5">
        <Link to="/staff" className="text-lg font-bold tracking-tight">
          phoxta{" "}
          <span className="block text-[10px] uppercase tracking-[.2em] text-brand">
            Startup School · Staff
          </span>
        </Link>
        <nav
          aria-label="Staff workspace"
          className="mt-5 flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-y-auto"
        >
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/staff"}
              className={({ isActive }) =>
                `flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-3 text-sm font-medium ${isActive ? "bg-brand-soft text-brand-ink" : "text-muted hover:bg-subtle"}`
              }
            >
              <n.icon size={18} aria-hidden="true" />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto hidden pt-8 text-xs leading-5 text-muted lg:block">
          Individual accounts.
          <br />
          Assigned responsibilities.
          <br />
          One shared school.
        </div>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line bg-white/70 px-5 py-3 sm:px-8">
          <div className="min-w-0">
            <p className="text-xs text-brand">
              {[...new Set(assignments.map((a) => ROLE_LABELS[a.role]))].join(
                " · ",
              )}
            </p>
            <p className="max-w-[70vw] truncate text-sm font-medium">
              {session?.user.email}
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <Link to={plan ? "/" : "/pricing"}>
              {plan ? "Switch to learning" : "Learner pricing"}
            </Link>
            <ActionButton action={signOut}>
              Sign out
            </ActionButton>
          </div>
        </header>
        <main
          id="staff-main"
          className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-8"
        >
          <div className="mx-auto max-w-6xl space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
