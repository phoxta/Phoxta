import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/primitives/theme-provider";
import { DirectionProvider } from "@/components/primitives/direction";
import LiveListings from "@/app/live-listings";

/**
 * The root provider tree. Light theme + LTR, and the live per-tenant catalogue
 * hydrated before any page renders.
 *
 * The bare <div> wrapper is load-bearing: the live-edit overlay addresses
 * headings, paragraphs and images by document-order index, so the element
 * count and nesting above the page must not change.
 */
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
