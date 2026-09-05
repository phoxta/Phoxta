import { ArrowRightIcon } from "@heroicons/react/24/outline";
import type { ReactNode } from "react";
import type { RouteProps } from "@/app/route-renderer";
import { Button } from "@/components/primitives/button";
import { Divider } from "@/components/primitives/divider";
import { Heading } from "@/components/primitives/heading";
import FeatureSection2 from "@/components/sections/feature-section-2";
import NewsletterSection from "@/components/sections/newsletter-section-1";
import SectionGridCategoryBox from "@/components/sections/section-grid-category-box";
import { getStayCategories } from "@/data/categories";
import { ApplicationLayout } from "@/routes/layouts/app-shell";

export default function FlightCategoriesLayout({ children }: RouteProps & { children: ReactNode }) {
    // Stay categories on purpose: the flight route shows destination cities, and
    // only the stay set carries them. Swapping in getFlightCategories would
    // change the tiles a visitor sees.
    const stayCategories = getStayCategories();

    return (
        <ApplicationLayout>
            {children}

            <div className="container mb-24 flex flex-col gap-y-20 lg:mb-28 lg:gap-y-28">
                <Divider />

                <div>
                    <div className="mb-11 flex flex-wrap items-end justify-between gap-5">
                        <Heading>
                            Popular destinations for flights <span data-slot="italic">from Bali</span>
                        </Heading>
                        <Button color="light">
                            Explore destinations
                            <ArrowRightIcon className="size-4!" />
                        </Button>
                    </div>
                    <SectionGridCategoryBox card="box1" categories={stayCategories.slice(0, 8)} />
                </div>
                <FeatureSection2 variant="up" />
                <NewsletterSection />
            </div>
        </ApplicationLayout>
    );
}
