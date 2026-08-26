import { Navigate, useLocation } from "react-router-dom";

/**
 * Knowledge now lives on the Train page (ConfigurePage), which the console
 * restructure mounted as the Engage rail's `agent` area. This stub is what
 * `/ops/engage/knowledge` renders, and it is also where the old
 * `/ops/agent/knowledge` deep links land, so its target must resolve against
 * its CURRENT parent (Engage): `../configure` was written for the flat agent
 * tab and now points at /ops/engage/configure, which is not a route at all.
 *
 * The query string rides along, like every other IA redirect in App.tsx — a
 * deep link's parameters are the reason it was a deep link.
 */
export default function KnowledgePage() {
  const { search } = useLocation();
  return <Navigate to={{ pathname: "../agent", search }} replace />;
}
