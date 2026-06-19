import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { DirectionProvider } from "@/components/ui/direction";
import LiveListings from "@/app-react/LiveListings";

// Mirrors the template's root layout provider tree (the <html>/<body> shell lives
// in index.html). Keeps light theme + LTR direction like the original, and loads
// the live per-tenant catalogue (LiveListings) before pages render.
export default function RootProviders({ children }: { children: ReactNode }) {
    return (
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
            <DirectionProvider direction="ltr" dir="ltr">
                <LiveListings>
                    <div>{children}</div>
                </LiveListings>
            </DirectionProvider>
        </ThemeProvider>
    );
}
