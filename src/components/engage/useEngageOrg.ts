import { useOutletContext, useParams } from "react-router-dom";
import { useCachedData } from "@/lib/hooks/useCachedData";
import { DASHBOARD_TTL } from "@/lib/cache/dashboardQueries";
import { getBusiness, type Organization } from "@/lib/db/organizations";
import { resolveConsole, type VerticalConsole } from "@/lib/ops/consoleConfig";
import type { OpsContext } from "@/layouts/OperatingLayout";

/**
 * The current business for an Engage area page.
 *
 * Prefers the OperatingLayout outlet context, but survives without it: a plain
 * `<Outlet />` in an intermediate layout resets outlet context for its
 * children, so this falls back to the `:id` route param and fetches the org
 * itself (cached, shared key). Engage pages should use this instead of
 * `useOutletContext` directly.
 */
export function useEngageOrg(): {
  orgId: string;
  org: Organization | null;
  cfg: VerticalConsole;
} {
  const ctx = useOutletContext<OpsContext | null | undefined>();
  const { id } = useParams();
  const orgId = ctx?.orgId ?? id ?? "";

  const { data: fetched } = useCachedData<Organization | null>(
    `ops:engage:org:${orgId || "none"}`,
    async () => {
      if (ctx?.org) return ctx.org;
      if (!orgId) return null;
      const { data, error } = await getBusiness(orgId);
      if (error) throw new Error(error);
      return data;
    },
    { ttl: DASHBOARD_TTL },
  );

  const org = ctx?.org ?? fetched ?? null;
  return { orgId, org, cfg: ctx?.console ?? resolveConsole(org?.vertical) };
}
