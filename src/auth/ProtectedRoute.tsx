import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";

function FullPageSpinner() {
  return (
    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: "100vh" }}>
      <div className="spinner-border text-dark" role="status" aria-label="Loading">
        <span className="visually-hidden">Loading…</span>
      </div>
    </div>
  );
}

/** Gate for every protected route. Redirects to /auth (preserving the intended
 *  path) when signed out, and to /onboarding until setup is complete — so the
 *  dashboard AND the studio editor are both covered. */
export default function ProtectedRoute() {
  const { session, loading, onboarded } = useAuth();
  const location = useLocation();

  // Still resolving the session, or have a session but haven't yet learned
  // whether onboarding is complete.
  if (loading || (session && onboarded === null)) {
    return <FullPageSpinner />;
  }

  if (!session) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?redirect=${redirect}`} replace />;
  }

  // New users finish onboarding first (but never bounce /onboarding to itself).
  if (onboarded === false && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
