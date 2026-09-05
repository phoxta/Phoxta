import { Car02FreeIcons } from "@hugeicons/core-free-icons";
import type { RouteProps } from "@/app/route-renderer";
import HeroSection4 from "@/components/sections/section-hero-4";
import SectionListingsCarousel from "@/components/sections/section-listings-carousel";
import { getCarCategoryByHandle } from "@/data/categories";
import { getCarListings } from "@/data/listings";
import carHeroImg from "@/assets/images/hero-img-car.webp";

export default function CarCategoriesPage({ params, searchParams }: RouteProps) {
    // V3: the handle is the whole segment, not its first character.
    const category = getCarCategoryByHandle(params.handle);
    const listings = getCarListings();

    // The predecessor reversed `listings` in place for the middle carousel, which
    // also flipped the third one below. Same rendered order, no mutation.
    const reversedListings = [...listings].reverse();

    return (
        <div className="relative container space-y-20 pb-28 sm:space-y-24">
            <HeroSection4
                heroImg={carHeroImg}
                heading={category.titleRaw}
                subHeading={`Over 80 car rental locations in the ${category.name}`}
                subHeadingIcon={Car02FreeIcons}
                searchFormInitTab="Cars"
            />

            {/* Collection demo */}
            <SectionListingsCarousel
                heading={`Top-rated car rentals <span data-slot="italic">in ${category.name}</span>`}
                headingFontClassName="text-2xl sm:text-3xl xl:text-4xl"
                subHeading="Guests agree: these cars are highly rated for quality, cleanliness, and more."
                listings={listings.slice(0, 8)}
                cardType="car"
            />

            {/* Collection demo */}
            <SectionListingsCarousel
                heading={`Car rentals with <span data-slot="italic">Premium class</span>`}
                headingFontClassName="text-2xl sm:text-3xl xl:text-4xl"
                listings={reversedListings.slice(2, 10)}
                cardType="car"
            />

            {/* Collection demo */}
            <SectionListingsCarousel
                heading={`Car rentals with <span data-slot="italic">Compact class</span>`}
                headingFontClassName="text-2xl sm:text-3xl xl:text-4xl"
                listings={reversedListings.slice(0, 8)}
                cardType="car"
            />
        </div>
    );
}
