import type { ReactNode } from "react";
import type { RouteProps } from "@/app/route-renderer";
import Header2 from "@/components/chrome/header/header2";
import { BreadcrumbExample } from "@/components/listing/listing-breadcrumb";
import { ApplicationLayout } from "@/routes/layouts/app-shell";

export default function ExperienceListingsLayout({ children }: RouteProps & { children: ReactNode }) {
    return (
        <ApplicationLayout header={<Header2 initSearchFormTab="Experiences" hasBorderBottom={true} />}>
            <div className="container mt-5 max-w-7xl lg:mt-8">
                {children}

                <div className="mt-10 mb-5">
                    <BreadcrumbExample />
                </div>
            </div>
        </ApplicationLayout>
    );
}
