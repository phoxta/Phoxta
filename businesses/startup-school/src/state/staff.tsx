import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { staffCan, type StaffAssignment } from "@/lib/staff";
import { useAuth } from "@/state/auth";
import { useTenant } from "@/state/tenant";

type StaffState = {
  ready: boolean;
  error: string | null;
  assignments: StaffAssignment[];
  isStaff: boolean;
  can: (permission: string, scope?: string, id?: string) => boolean;
  refresh: () => Promise<void>;
};
const Context = createContext<StaffState | null>(null);
export function StaffProvider({ children }: { children: ReactNode }) {
  const { session, ready: authReady } = useAuth();
  const { tenant, ready: tenantReady } = useTenant();
  const [assignments, setAssignments] = useState<StaffAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userId = session?.user.id;
  const orgId = tenant?.id;
  const identityKey = `${userId ?? ""}:${orgId ?? ""}`;
  const [resolvedKey, setResolvedKey] = useState("");
  const requestId = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++requestId.current;
    if (!userId || !orgId) {
      setAssignments([]);
      setError(null);
      setLoading(false);
      setResolvedKey(identityKey);
      return;
    }
    const result = await supabase.rpc("cs_staff_identity", { p_org: orgId });
    if (request !== requestId.current) return;
    setAssignments(
      result.error
        ? []
        : ((result.data?.assignments ?? []) as StaffAssignment[]),
    );
    setError(
      result.error ? "We couldn't verify staff access. Please retry." : null,
    );
    setLoading(false);
    setResolvedKey(identityKey);
  }, [userId, orgId, identityKey]);
  useEffect(() => {
    setLoading(true);
    void refresh();
    return () => {
      requestId.current += 1;
    };
  }, [refresh]);
  useEffect(() => {
    const update = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = window.setInterval(update, 30_000);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, [refresh]);
  const value = useMemo<StaffState>(
    () => ({
      ready:
        authReady && tenantReady && !loading && resolvedKey === identityKey,
      error,
      assignments: resolvedKey === identityKey ? assignments : [],
      isStaff: resolvedKey === identityKey && assignments.length > 0,
      can: (p, s, id) =>
        resolvedKey === identityKey && staffCan(assignments, p, s, id),
      refresh,
    }),
    [
      authReady,
      tenantReady,
      loading,
      error,
      assignments,
      refresh,
      resolvedKey,
      identityKey,
    ],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useStaff() {
  const value = useContext(Context);
  if (!value) throw new Error("useStaff outside StaffProvider");
  return value;
}
