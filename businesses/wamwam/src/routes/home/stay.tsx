import { ArrowRightIcon } from "@heroicons/react/24/outline";
import type { RouteProps } from "@/app/route-renderer";
import SectionGridPosts3 from "@/components/blog/section-grid-post-3";
import { Button } from "@/components/primitives/button";
import { Heading } from "@/components/primitives/heading";
import { Text } from "@/components/primitives/text";
import FeatureSection2 from "@/components/sections/feature-section-2";
import InspirationFutureGetawaysSection from "@/components/sections/inspiration-future-getaways-section";
import NewsletterSection from "@/components/sections/newsletter-section-1";
import SectionDreamDestination from "@/components/sections/section-dream-destination";
import SectionGridAuthorBox from "@/components/sections/section-grid-author-box";
import SectionGridCategoryBox from "@/components/sections/section-grid-category-box";
import SectionGridFeaturedListings from "@/components/sections/section-grid-featured-listings";
import SectionGroupCategoriesCarousel from "@/components/sections/section-group-categories-carousel";
import HeroSection3 from "@/components/sections/section-hero-3";
import SectionHowItWork2 from "@/components/sections/section-how-it-work-2";
import SectionInterestingInfor from "@/components/sections/section-interesting-infor";
import SectionListingsCarousel from "@/components/sections/section-listings-carousel";
import LogoCloud from "@/components/sections/section-logo-cloud";
import SectionWhyUs from "@/components/sections/section-why-us";
import { getAuthors } from "@/data/authors";
import { getGroupStayCategories, getStayCategories } from "@/data/categories";
import { getBlogPosts } from "@/data/content";
import { getStayListings } from "@/data/listings";

export default function StayPage({ params, searchParams }: RouteProps) {
    const categories = getStayCategories();
    const stayListings = getStayListings();
    const authors = getAuthors();
    const groupCategories = getGroupStayCategories();
    const posts = getBlogPosts();

    // slice() returns a new array, so this reverse() does not touch stayListings.
    const baliListings = stayListings.slice(0, 8).reverse();

    return (
        <main className="relative section-space-bottom">
            <section className="px-4">
                <HeroSection3 />
            </section>

            <section className="container section-space-smaller pb-0!">
                <LogoCloud />
                <div className="section-space sm:mt-10">
                    <SectionDreamDestination />
                </div>
            </section>

            <section className="container section-space">
                <InspirationFutureGetawaysSection heading="" className="text-center" />
            </section>

            <section className="container section-space">
                <SectionGridFeaturedListings stayListings={stayListings.slice(0, 4)} />
            </section>

            <section className="container section-space">
                <SectionGroupCategoriesCarousel groupCategories={groupCategories} />
            </section>

            <section className="container section-space">
                <SectionInterestingInfor />
            </section>
            <section className="container section-space">
                <SectionHowItWork2 />
            </section>

            <section className="container section-space">
                <SectionListingsCarousel listings={stayListings.slice(0, 8)} cardType="stay" />
            </section>
            <section className="container py-12">
                <SectionListingsCarousel
                    listings={baliListings}
                    cardType="stay"
                    heading={`Popular homes <span data-slot="italic">in Bali</span>`}
                />
            </section>
            <section className="container section-space">
                <div className="mb-11 flex flex-wrap items-end justify-between gap-5">
                    <Heading>
                        Explore <span data-slot="italic">near by you</span>
                    </Heading>
                    <Button color="light" href="/stay-search-with-map">
                        Explore destinations
                        <ArrowRightIcon className="size-4! rtl:rotate-180" />
                    </Button>
                </div>
                <SectionGridCategoryBox categories={categories.slice(0, 8)} />
            </section>

            <section className="container section-space">
                <SectionWhyUs />
            </section>

            <section className="container section-space">
                <Heading>
                    Stay with top-rated <span data-slot="italic">hosts</span>
                </Heading>
                <Text className="mt-3 max-w-lg text-neutral-600 dark:text-neutral-400">
                    Selected for their exceptional hospitality and top-rated properties.
                </Text>
                <SectionGridAuthorBox className="mt-13" boxCard="box1" authors={authors} />
            </section>

            <section className="container section-space">
                <FeatureSection2 variant="up" />
            </section>

            <section className="container section-space">
                <SectionGridPosts3 posts={posts.slice(0, 4)} />
            </section>

            <section className="container py-12 lg:py-16">
                <NewsletterSection />
            </section>
        </main>
    );
}
