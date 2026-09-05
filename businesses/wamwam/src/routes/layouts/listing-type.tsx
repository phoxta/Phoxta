import type { ReactNode } from "react";
import type { RouteProps } from "@/app/route-renderer";
import { ApplicationLayout } from "@/routes/layouts/app-shell";

/**
 * The home routes. No `header` override, so the shell falls back to its own
 * <Header hasBorderBottom={false} /> — the hero sits flush under it.
 */
export default function ListingTypeLayout({ children }: RouteProps & { children: ReactNode }) {
    return <ApplicationLayout>{children}</ApplicationLayout>;
}
