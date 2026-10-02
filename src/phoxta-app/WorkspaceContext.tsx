import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { listMyOrganizations, type Organization } from "@/lib/db/organizations";

export type AutopilotMode = "Assist" | "Approve" | "Autopilot";

type WorkspaceContextValue = {
  business: Organization;
  businesses: Organization[];
  selectBusiness: (id: string) => void;
  mode: AutopilotMode;
  setMode: (mode: AutopilotMode) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const BUSINESS_KEY = "phoxta-v2-business";

function readStoredBusiness() {
  try { return window.localStorage.getItem(BUSINESS_KEY); } catch { return null; }
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [businesses, setBusinesses] = useState<Organization[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(readStoredBusiness);
  const [mode, setMode] = useState<AutopilotMode>("Approve");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listMyOrganizations().then(({ data, error: loadError }) => {
      if (!active) return;
      const organizations = data.map(({ organization }) => organization);
      setBusinesses(organizations);
      setError(loadError);
      setBusinessId((current) => organizations.some((item) => item.id === current) ? current : organizations[0]?.id ?? null);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const business = businesses.find((item) => item.id === businessId) ?? businesses[0] ?? null;

  const value = useMemo<WorkspaceContextValue | null>(() => business ? ({
    business,
    businesses,
    mode,
    setMode,
    selectBusiness(id) {
      setBusinessId(id);
      try { window.localStorage.setItem(BUSINESS_KEY, id); } catch { /* Storage can be unavailable. */ }
    },
  }) : null, [business, businesses, mode]);

  if (loading) return <div className="pxc-workspace-state" role="status">Loading your businesses…</div>;
  if (error) return <div className="pxc-workspace-state is-error"><strong>Couldn’t load your businesses</strong><span>{error}</span></div>;
  if (!value) return <div className="pxc-workspace-state"><strong>No business workspace yet</strong><a href="/dashboard/businesses">Create or open a business</a></div>;

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return value;
}
