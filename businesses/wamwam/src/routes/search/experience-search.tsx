import type { RouteProps } from "@/app/route-renderer";
import ExperiencesCard from "@/components/cards/experiences-card";
import ListingFilterTabs from "@/components/cards/listing-filter-tabs";
import { Divider } from "@/components/primitives/divider";
import Pagination from "@/components/primitives/pagination";
import { getExperienceListingFilterOptions } from "@/data/filters";
import { getExperienceListings } from "@/data/listings";

export default function ExperienceSearchPage({ params, searchParams }: RouteProps) {
    const listings = getExperienceListings();
    const filterOptions = getExperienceListingFilterOptions();

    return (
        <div className="relative pb-28">
            <ListingFilterTabs filterOptions={filterOptions} className="container mt-6 flex justify-center lg:mt-3" />

            <Divider className="my-6 lg:my-9" />

            {/* Content */}
            <div className="relative container">
                <h2 id="heading" className="scroll-mt-20 text-lg font-[550] lg:text-xl">
                    Explore over 8,000 experiences
                </h2>

                <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 md:gap-y-12 lg:mt-6 lg:grid-cols-3 xl:gap-x-8 2xl:grid-cols-4 2xl:gap-x-7">
                    {listings.map((listing) => (
                        <ExperiencesCard key={listing.id} data={listing} />
                    ))}
                </div>
                <div className="mt-20 flex items-center justify-center">
                    <Pagination />
                </div>
            </div>
        </div>
    );
}
