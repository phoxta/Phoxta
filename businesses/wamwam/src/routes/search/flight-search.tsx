import type { RouteProps } from "@/app/route-renderer";
import FlightCard from "@/components/cards/flight-card";
import ListingFilterTabs from "@/components/cards/listing-filter-tabs";
import { Divider } from "@/components/primitives/divider";
import Pagination from "@/components/primitives/pagination";
import { getFlightFilterOptions } from "@/data/filters";
import { getFlightListings } from "@/data/listings";

export default function FlightSearchPage({ params, searchParams }: RouteProps) {
    const listings = getFlightListings();
    const filterOptions = getFlightFilterOptions();

    return (
        <div className="relative pb-28">
            <ListingFilterTabs filterOptions={filterOptions} className="container mt-6 flex justify-center lg:mt-3" />

            <Divider className="my-6 lg:my-9" />

            {/* Content */}
            <div className="relative container">
                <h2 id="heading" className="scroll-mt-20 text-lg font-[550] lg:text-xl">
                    Explore over 10,000 flights
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
        </div>
    );
}
