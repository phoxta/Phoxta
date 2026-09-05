import type { ReactNode } from "react";
import type { RouteProps } from "@/app/route-renderer";

/**
 * Auth routes render bare — no shell, no header, no footer. The screen paints
 * its own full-page chrome.
 */
export default function AuthLayout({ children }: RouteProps & { children: ReactNode }) {
    return <>{children}</>;
}
