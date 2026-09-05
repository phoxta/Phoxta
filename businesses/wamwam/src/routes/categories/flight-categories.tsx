import { Airplane02Icon } from "@hugeicons/core-free-icons";
import type { RouteProps } from "@/app/route-renderer";
import FlightCard from "@/components/cards/flight-card";
import ListingFilterTabs from "@/components/cards/listing-filter-tabs";
import { Divider } from "@/components/primitives/divider";
import Pagination from "@/components/primitives/pagination";
import HeroSection4 from "@/components/sections/section-hero-4";
import { getFlightCategoryByHandle } from "@/data/categories";
import { getFlightFilterOptions } from "@/data/filters";
import { getFlightListings } from "@/data/listings";
import { convertNumbThousand } from "@/lib/format";
import flightHeroImg from "@/assets/images/hero-img-flight.webp";

export default function FlightCategoriesPage({ params, searchParams }: RouteProps) {
    // V3: the handle is the whole segment, not its first character.
    const category = getFlightCategoryByHandle(params.handle);
    const listings = getFlightListings();
    const filterOptions = getFlightFilterOptions();

    return (
        <div className="relative container pb-28">
            <HeroSection4
                heroImg={flightHeroImg}
                heading={category.titleRaw}
                subHeading={`Over 80 flights ${category.name}`}
                subHeadingIcon={Airplane02Icon}
                searchFormInitTab="Flights"
            />

            <ListingFilterTabs
                className="mt-20 justify-center"
                filterOptions={filterOptions}
                optionPanelAnchor="bottom start"
            />

            <Divider className="my-8 md:my-12" />
            <h2 id="heading" className="scroll-mt-20 text-lg font-medium">
                Showing {convertNumbThousand(category.count)} results
            </h2>

            <div className="mt-7 grid grid-cols-1 gap-y-8">
                {listings.map((listing) => (
                    <FlightCard key={listing.id} data={listing} />
                ))}
            </div>

            <div className="mt-20 flex items-center justify-center">
                <Pagination />
            </div>
        </div>
    );
}
