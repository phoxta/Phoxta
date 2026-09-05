import { ArrowRightIcon } from "@heroicons/react/24/outline";
import type { ReactNode } from "react";
import type { RouteProps } from "@/app/route-renderer";
import Header2 from "@/components/chrome/header/header2";
import { Button } from "@/components/primitives/button";
import { Divider } from "@/components/primitives/divider";
import { Heading } from "@/components/primitives/heading";
import FeatureSection2 from "@/components/sections/feature-section-2";
import NewsletterSection from "@/components/sections/newsletter-section-1";
import SectionGridCategoryBox from "@/components/sections/section-grid-category-box";
import { getExperienceCategories } from "@/data/categories";
import { ApplicationLayout } from "@/routes/layouts/app-shell";

export default function ExperienceSearchLayout({ children }: RouteProps & { children: ReactNode }) {
    const categories = getExperienceCategories();

    return (
        <ApplicationLayout header={<Header2 initSearchFormTab="Experiences" hasBorderBottom={false} />}>
            {children}

            <div className="container mb-24 flex flex-col gap-y-20 lg:mb-28 lg:gap-y-28">
                <Divider />

                <div>
                    <div className="mb-11 flex flex-wrap items-end justify-between gap-5">
                        <Heading>
                            Explore <span data-slot="italic">near by you</span>
                        </Heading>
                        <Button color="light">
                            Explore destinations
                            <ArrowRightIcon className="size-4!" />
                        </Button>
                    </div>
                    {/* card="5" is specific to this route — the categories routes take the grid's default card. */}
                    <SectionGridCategoryBox categories={categories.slice(0, 8)} card="5" />
                </div>
                <FeatureSection2 variant="up" />
                <NewsletterSection />
            </div>
        </ApplicationLayout>
    );
}
