import type { RouteProps } from "@/app/route-renderer";
import HeroSection4 from "@/components/sections/section-hero-4";
import SectionListingsCarousel from "@/components/sections/section-listings-carousel";
import { getStayCategoryByHandle } from "@/data/categories";
import { getStayListings } from "@/data/listings";

export default function StayCategoriesPage({ params, searchParams }: RouteProps) {
    // V3: the handle is the whole segment, not its first character.
    const category = getStayCategoryByHandle(params.handle);
    const listings = getStayListings();

    return (
        <div className="relative container space-y-20 pb-28 sm:space-y-24">
            <HeroSection4 heading={category.titleRaw} subHeading={`${category.count} vacation rentals in ${category.name}`} />

            {/* Collection demo */}
            <SectionListingsCarousel
                heading={`Top-rated house rentals <span data-slot="italic">in ${category.name}</span>`}
                headingFontClassName="text-2xl sm:text-3xl xl:text-4xl"
                subHeading="Guests agree: these houses are highly rated for location, cleanliness, and more."
                listings={listings.slice(0, 8)}
                cardType="stay"
            />

            {/* Collection demo */}
            <SectionListingsCarousel
                heading={`House rentals with <span data-slot="italic">free parking</span>`}
                headingFontClassName="text-2xl sm:text-3xl xl:text-4xl"
                listings={listings.slice(2, 10)}
                cardType="stay"
            />

            {/* Collection demo */}
            <SectionListingsCarousel
                heading={`House rentals with <span data-slot="italic">a hot tub</span>`}
                headingFontClassName="text-2xl sm:text-3xl xl:text-4xl"
                listings={listings.slice(0, 8)}
                cardType="stay"
            />
        </div>
    );
}
