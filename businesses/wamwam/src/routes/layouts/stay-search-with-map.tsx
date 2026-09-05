import type { ReactNode } from "react";
import type { RouteProps } from "@/app/route-renderer";
import Header2 from "@/components/chrome/header/header2";
import { ApplicationLayout } from "@/routes/layouts/app-shell";

/** The map page scrolls its two columns independently, so the header sticks. */
export default function StaySearchWithMapLayout({ children }: RouteProps & { children: ReactNode }) {
    return (
        <ApplicationLayout isStickyHeader header={<Header2 initSearchFormTab="Stays" />}>
            {children}
        </ApplicationLayout>
    );
}
