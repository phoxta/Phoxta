import { ArrowRightIcon } from "@heroicons/react/24/outline";
import type { RouteProps } from "@/app/route-renderer";
import SectionGridPosts3 from "@/components/blog/section-grid-post-3";
import { Button } from "@/components/primitives/button";
import { Heading } from "@/components/primitives/heading";
import FeatureSection2 from "@/components/sections/feature-section-2";
import InspirationFutureGetawaysSection from "@/components/sections/inspiration-future-getaways-section";
import NewsletterSection from "@/components/sections/newsletter-section-1";
import SectionCategoriesCarousel from "@/components/sections/section-categories-carousel";
import SectionDreamDestination from "@/components/sections/section-dream-destination";
import SectionGridCategoryBox from "@/components/sections/section-grid-category-box";
import HeroSection3 from "@/components/sections/section-hero-3";
import SectionHowItWork2 from "@/components/sections/section-how-it-work-2";
import LogoCloud from "@/components/sections/section-logo-cloud";
import SectionWhyUs from "@/components/sections/section-why-us";
import { getFlightCategories } from "@/data/categories";
import { getBlogPosts } from "@/data/content";
import flightHeroImg from "@/assets/images/hero-img-flight.webp";

export default function FlightPage({ params, searchParams }: RouteProps) {
    const categories = getFlightCategories();
    const posts = getBlogPosts();

    return (
        <main className="relative section-space-bottom">
            <div className="px-4">
                <HeroSection3
                    initTab="Flights"
                    title={
                        <>
                            Book your <span data-slot="italic">flight</span> tickets
                        </>
                    }
                    heroImg={flightHeroImg}
                />
            </div>

            <div className="container section-space-smaller pb-0!">
                <LogoCloud />
                <section className="section-space sm:mt-2.5">
                    <SectionHowItWork2 heading="" subHeading="" />
                </section>
            </div>

            <section className="container section-space">
                <SectionDreamDestination />
            </section>

            <section className="container section-space">
                <InspirationFutureGetawaysSection heading="" />
            </section>

            <section className="container section-space">
                <SectionCategoriesCarousel
                    heading={
                        <>
                            Explore by <span data-slot="italic">destination</span> or <span data-slot="italic">country</span>
                        </>
                    }
                    categories={categories.slice(6, 14)}
                    cardStyle="4"
                />
            </section>

            <section className="container section-space">
                <SectionWhyUs />
            </section>

            <section className="container section-space">
                <div className="mb-12 flex flex-wrap items-end justify-between gap-5">
                    <Heading>
                        Popular flights <span data-slot="italic">near by you</span>
                    </Heading>
                    <Button color="light">
                        Explore destinations
                        <ArrowRightIcon className="size-4!" />
                    </Button>
                </div>
                <SectionGridCategoryBox categories={categories.slice(0, 8)} />
            </section>

            <section className="container section-space">
                <FeatureSection2 variant="up" />
            </section>

            <section className="container section-space">
                <SectionGridPosts3 posts={posts.slice(0, 4)} />
            </section>

            <section className="container section-space-smaller">
                <NewsletterSection />
            </section>
        </main>
    );
}
