import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { listMyOrganizations, type Organization } from "@/lib/db/organizations";

export type AutopilotMode = "Assist" | "Approve" | "Autopilot";

type WorkspaceContextValue = {
  business: Organization | null;
  businesses: Organization[];
  selectBusiness: (id: string) => void;
  refreshBusinesses: (preferredId?: string) => Promise<Organization | null>;
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

  const refreshBusinesses = useCallback(async (preferredId?: string) => {
    const { data, error: loadError } = await listMyOrganizations();
    const organizations = data.map(({ organization }) => organization);
    setBusinesses(organizations);
    setError(loadError);
    const currentId = preferredId ?? readStoredBusiness();
    const chosen = organizations.find((item) => item.id === currentId)
      ?? organizations[0]
      ?? null;
    setBusinessId(chosen?.id ?? null);
    if (chosen) try { window.localStorage.setItem(BUSINESS_KEY, chosen.id); } catch { /* Storage can be unavailable. */ }
    setLoading(false);
    return chosen;
  }, []);

  useEffect(() => { void refreshBusinesses(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const business = businesses.find((item) => item.id === businessId) ?? businesses[0] ?? null;

  const value = useMemo<WorkspaceContextValue>(() => ({
    business,
    businesses,
    mode,
    setMode,
    selectBusiness(id) {
      setBusinessId(id);
      try { window.localStorage.setItem(BUSINESS_KEY, id); } catch { /* Storage can be unavailable. */ }
    },
    refreshBusinesses,
  }), [business, businesses, mode, refreshBusinesses]);

  if (loading) return <div className="pxc-workspace-state" role="status">Loading your businesses…</div>;
  if (error) return <div className="pxc-workspace-state is-error"><strong>Couldn’t load your businesses</strong><span>{error}</span></div>;
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWorkspace() {
  const value = useWorkspaceState();
  if (!value.business) throw new Error("An operating business is required for this workspace");
  return value as WorkspaceContextValue & { business: Organization };
}

// Catalogue, payment and activation routes must also work for a new account
// that has not bought or built its first operating business yet.
// eslint-disable-next-line react-refresh/only-export-components
export function useWorkspaceState() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return value;
}
