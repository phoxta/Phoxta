import type { RouteProps } from "@/app/route-renderer";
import HeaderGallery from "@/components/listing/header-gallery";
import ReserveBox from "@/components/listing/reserve-box";
import SectionAmenities from "@/components/listing/section-amenities";
import SectionDateRange from "@/components/listing/section-date-range";
import { SectionFeaturedAmenities } from "@/components/listing/section-featured-amenities";
import SectionHeader from "@/components/listing/section-header";
import { SectionHeading } from "@/components/listing/section-heading";
import SectionHost from "@/components/listing/section-host";
import SectionListingReviews from "@/components/listing/section-listing-reviews";
import SectionMap from "@/components/listing/section-map";
import { Divider } from "@/components/primitives/divider";
import { getListingReviews } from "@/data/content";
import { getStayListingByHandle } from "@/data/listings";

export default function StayDetailPage({ params, searchParams }: RouteProps) {
    const handle = params.handle ?? "";

    // getStayListingByHandle falls back to the first listing for an unknown handle
    // and calls notFound() only on an empty catalogue — no missing-listing branch.
    const listing = getStayListingByHandle(handle);
    const reviews = getListingReviews(handle);

    const {
        address,
        galleryImgs,
        listingCategory,
        reviewCount,
        reviewStart,
        title,
        host,
        amenities: featuredAmenities,
        fullAmenities,
    } = listing;

    return (
        <div>
            {/*  HEADER */}
            <HeaderGallery images={galleryImgs} gridType="grid2" />

            {/* MAIN */}
            <main className="mt-10 flex flex-col gap-8 lg:flex-row xl:gap-[8%]">
                {/* CONTENT */}
                <div className="flex w-full flex-col lg:w-3/5 xl:w-[59%]">
                    <SectionHeader
                        address={address}
                        host={host}
                        listingCategory={listingCategory}
                        reviewCount={reviewCount}
                        reviewStart={reviewStart}
                        title={title}
                    />

                    <Divider className="my-8 xl:my-12" />

                    <SectionFeaturedAmenities featuredAmenities={featuredAmenities} />

                    <Divider className="my-8 xl:my-12" />

                    <div className="listingSection__wrap">
                        <SectionHeading>Stay information</SectionHeading>
                        <div className="leading-relaxed text-gray-700 dark:text-gray-300">
                            <span>
                                Providing lake views, The Symphony 9 Tam Coc in Ninh Binh provides accommodation, an outdoor swimming pool,
                                a bar, a shared lounge, a garden and barbecue facilities. Complimentary WiFi is provided.
                            </span>
                            <br />
                            <br />
                            <span>There is a private bathroom with bidet in all units, along with a hairdryer and free toiletries.</span>
                            <br /> <br />
                            <span>
                                The Symphony 9 Tam Coc offers a terrace. Both a bicycle rental service and a car rental service are
                                available at the accommodation, while cycling can be enjoyed nearby.
                            </span>
                        </div>
                    </div>

                    <Divider className="my-8 xl:my-12" />

                    <SectionAmenities amenities={fullAmenities} />

                    <Divider className="my-8 xl:my-12" />

                    <SectionDateRange />
                </div>

                {/* SIDEBAR */}
                <div className="grow">
                    <div className="sticky top-10">
                        <ReserveBox listing={listing} vertical="stay" />
                    </div>
                </div>
            </main>

            <Divider className="my-10 xl:my-16" />

            <div className="flex flex-col gap-8 lg:flex-row lg:gap-10 xl:gap-16">
                <div className="w-full lg:w-4/9 xl:w-1/3">
                    <SectionHost {...host} />
                </div>
                <div className="w-full lg:w-2/3">
                    <SectionListingReviews reviewCount={reviewCount} reviewStart={reviewStart} reviews={reviews} />
                </div>
            </div>

            <Divider className="my-10 xl:my-16" />

            <SectionMap location={{ ...listing.map, id: 1, name: title }} />
        </div>
    );
}
