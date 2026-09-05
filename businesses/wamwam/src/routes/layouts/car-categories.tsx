import { ArrowRightIcon } from "@heroicons/react/24/outline";
import type { ReactNode } from "react";
import type { RouteProps } from "@/app/route-renderer";
import { Button } from "@/components/primitives/button";
import { Divider } from "@/components/primitives/divider";
import { Heading } from "@/components/primitives/heading";
import FeatureSection2 from "@/components/sections/feature-section-2";
import NewsletterSection from "@/components/sections/newsletter-section-1";
import SectionGridCategoryBox from "@/components/sections/section-grid-category-box";
import { getCarCategories } from "@/data/categories";
import { ApplicationLayout } from "@/routes/layouts/app-shell";

export default function CarCategoriesLayout({ children }: RouteProps & { children: ReactNode }) {
    // The source sliced to 8 twice; once is the same eight categories.
    const categories = getCarCategories().slice(0, 8);

    return (
        <ApplicationLayout>
            {children}

            <div className="container mb-24 flex flex-col gap-y-20 lg:mb-28 lg:gap-y-28">
                <Divider />

                <div>
                    <div className="mb-11 flex flex-wrap items-end justify-between gap-5">
                        <Heading>
                            Popular car rental <span data-slot="italic">destinations</span>
                        </Heading>
                        <Button color="light">
                            Explore destinations
                            <ArrowRightIcon className="size-4!" />
                        </Button>
                    </div>
                    <SectionGridCategoryBox categories={categories} />
                </div>
                <FeatureSection2 variant="up" />
                <NewsletterSection />
            </div>
        </ApplicationLayout>
    );
}
