import type { RouteProps } from "@/app/route-renderer";
import HeroSection4 from "@/components/sections/section-hero-4";
import SectionListingsCarousel from "@/components/sections/section-listings-carousel";
import { getExperienceCategoryByHandle } from "@/data/categories";
import { getExperienceListings } from "@/data/listings";
import heroImg from "@/assets/images/hero-img-exp.webp";

export default function ExperienceCategoriesPage({ params, searchParams }: RouteProps) {
    // V3: params.handle is the whole segment. The predecessor passed `handle?.[0]`,
    // which indexes the first CHARACTER of the string, so every URL resolved to
    // the same category.
    const category = getExperienceCategoryByHandle(params.handle);
    const listings = getExperienceListings();

    return (
        <div className="relative container space-y-20 pb-28 sm:space-y-24">
            <HeroSection4
                heading={category.titleRaw}
                subHeading={`${category.count} experiences in ${category.name}`}
                heroImg={heroImg}
            />

            {/* Collection demo */}
            <SectionListingsCarousel
                heading={`Top-rated experiences <span data-slot="italic">in ${category.name}</span>`}
                headingFontClassName="text-2xl sm:text-3xl xl:text-4xl"
                subHeading="View our most highly rated experiences, loved by guests."
                listings={listings.slice(0, 8)}
                cardType="experience"
            />

            {/* Collection demo */}
            <SectionListingsCarousel
                heading={`Top-rated <span data-slot="italic">art and culture</span> activities`}
                headingFontClassName="text-2xl sm:text-3xl xl:text-4xl"
                listings={listings.slice(2, 10)}
                cardType="experience"
            />

            {/* Collection demo */}
            <SectionListingsCarousel
                heading={`Top-rated <span data-slot="italic">food and drink</span> activities`}
                headingFontClassName="text-2xl sm:text-3xl xl:text-4xl"
                listings={listings.slice(0, 8)}
                cardType="experience"
            />
        </div>
    );
}
