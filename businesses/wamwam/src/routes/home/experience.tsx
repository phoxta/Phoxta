import { ArrowRightIcon } from "@heroicons/react/24/outline";
import type { RouteProps } from "@/app/route-renderer";
import SectionGridPosts3 from "@/components/blog/section-grid-post-3";
import { Button } from "@/components/primitives/button";
import { Divider } from "@/components/primitives/divider";
import { Heading } from "@/components/primitives/heading";
import { Text } from "@/components/primitives/text";
import FeatureSection2 from "@/components/sections/feature-section-2";
import InspirationFutureGetawaysSection from "@/components/sections/inspiration-future-getaways-section";
import NewsletterSection from "@/components/sections/newsletter-section-1";
import SectionCategoriesCarousel from "@/components/sections/section-categories-carousel";
import SectionDreamDestination from "@/components/sections/section-dream-destination";
import SectionGridAuthorBox from "@/components/sections/section-grid-author-box";
import SectionGridCategoryBox from "@/components/sections/section-grid-category-box";
import HeroSection3 from "@/components/sections/section-hero-3";
import SectionListingsCarousel from "@/components/sections/section-listings-carousel";
import SectionWhyUs from "@/components/sections/section-why-us";
import { getAuthors } from "@/data/authors";
import { getExperienceCategories } from "@/data/categories";
import { getBlogPosts } from "@/data/content";
import { getExperienceListings } from "@/data/listings";
import experienceHeroImg from "@/assets/images/hero-img-exp.webp";

export default function ExperiencePage({ params, searchParams }: RouteProps) {
    const categories = getExperienceCategories();
    const experienceListings = getExperienceListings();
    const authors = getAuthors();
    const posts = getBlogPosts();

    // reverse() is in-place: copy first, so the carousel above -- which slices the
    // same array -- still shows the catalogue in its own order.
    const osakaListings = [...experienceListings].reverse().slice(0, 8);

    return (
        <main className="relative section-space-bottom">
            <div className="px-4">
                <HeroSection3
                    initTab="Experiences"
                    title={
                        <>
                            Explore activities and <span data-slot="italic">experiences</span> in the world
                        </>
                    }
                    heroImg={experienceHeroImg}
                />
            </div>

            <section className="container mt-5 section-space sm:mt-10 xl:mt-12">
                <SectionDreamDestination />
            </section>

            <section className="container section-space">
                <InspirationFutureGetawaysSection heading="" />
            </section>

            <section className="container section-space">
                <SectionCategoriesCarousel categories={categories} cardStyle="4" />
            </section>

            <section className="container py-12">
                <SectionListingsCarousel
                    heading={`Good for <span data-slot="italic">solo</span> travelers`}
                    listings={experienceListings.slice(0, 8)}
                    cardType="experience"
                />
            </section>

            <section className="container section-space">
                <SectionListingsCarousel
                    heading={`Experiences in <span data-slot="italic">Osaka</span>`}
                    listings={osakaListings}
                    cardType="experience"
                />
            </section>

            <section className="container section-space">
                <FeatureSection2 variant="up" />
            </section>

            <section className="container section-space">
                <Heading>
                    Top <span data-slot="italic">co-hosts</span> of the month
                </Heading>
                <Text className="mt-3 max-w-lg text-neutral-600 dark:text-neutral-400">
                    We love it for modern UI design because of its simple, clean, and distinctive geometric style and the
                    designers actively work.
                </Text>
                <SectionGridAuthorBox className="mt-13" boxCard="box1" authors={authors} />
            </section>

            <div className="container section-space-smaller">
                <Divider />
            </div>

            <section className="container section-space">
                <div className="mb-12 flex flex-wrap items-end justify-between gap-5">
                    <Heading>
                        Explore <span data-slot="italic">near by you</span>
                    </Heading>
                    <Button color="light">
                        Explore destinations
                        <ArrowRightIcon className="size-4!" />
                    </Button>
                </div>
                <SectionGridCategoryBox categories={categories.slice(0, 8)} />
            </section>

            <section className="container section-space">
                <SectionWhyUs />
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
