import type { RouteProps } from "@/app/route-renderer";
import SectionGridHasMap from "@/routes/search/section-grid-has-map";
import { getStayListingFilterOptions } from "@/data/filters";
import { getStayListings } from "@/data/listings";

export default function StaySearchWithMapPage({ params, searchParams }: RouteProps) {
    const listings = getStayListings();
    const filterOptions = getStayListingFilterOptions();

    return (
        <div className="container px-4 lg:px-8 xl:max-w-none">
            <SectionGridHasMap listings={listings} filterOptions={filterOptions} />
        </div>
    );
}
