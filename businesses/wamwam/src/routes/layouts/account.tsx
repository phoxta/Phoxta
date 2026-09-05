import type { ReactNode } from "react";
import type { RouteProps } from "@/app/route-renderer";
import Header2 from "@/components/chrome/header/header2";
import { ApplicationLayout } from "@/routes/layouts/app-shell";
import { PageNavigation } from "@/routes/layouts/account-page-navigation";

export default function AccountLayout({ children }: RouteProps & { children: ReactNode }) {
    return (
        // Wander sells experiences only — a "Stays" search tab offered something
        // this business does not do.
        <ApplicationLayout header={<Header2 initSearchFormTab="Experiences" />}>
            <div className="bg-neutral-50 dark:bg-neutral-900">
                <div className="border-b border-border bg-background pt-12">
                    <PageNavigation />
                </div>
                <div className="container pt-14 pb-24 sm:pt-16 lg:pb-32">{children}</div>
            </div>
        </ApplicationLayout>
    );
}
