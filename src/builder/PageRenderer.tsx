import { Render } from "@measured/puck";
import { puckConfig } from "./puckConfig";
import type { PageDocument } from "./types";

/**
 * Runtime renderer for a built page. Renders the real section components from a
 * saved document — used by the Studio preview and (Phase 6) the published
 * storefront. Mount this inside a host that provides the chrome + GSAP effects
 * (e.g. MainLayout / a smooth-scroll wrapper) to get full animated fidelity;
 * rendered bare (no effects) it shows a clean static page.
 */
export default function PageRenderer({ data }: { data: PageDocument }) {
  return <Render config={puckConfig} data={data} />;
}
