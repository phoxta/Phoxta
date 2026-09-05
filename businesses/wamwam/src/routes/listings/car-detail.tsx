import {
    CheckmarkCircle01Icon,
    DollarCircleIcon,
    IdentityCardIcon,
    SchoolReportCardIcon,
    TicketIcon,
    UserCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { RouteProps } from "@/app/route-renderer";
import HeaderGallery from "@/components/listing/header-gallery";
import ReserveBox from "@/components/listing/reserve-box";
import { SectionFeaturedAmenities } from "@/components/listing/section-featured-amenities";
import SectionHeader from "@/components/listing/section-header";
import { SectionHeading } from "@/components/listing/section-heading";
import SectionHost from "@/components/listing/section-host";
import SectionListingReviews from "@/components/listing/section-listing-reviews";
import SectionMap from "@/components/listing/section-map";
import {
    DescriptionDetails,
    DescriptionList,
    DescriptionTerm,
} from "@/components/primitives/description-list";
import { Divider } from "@/components/primitives/divider";
import { getListingReviews } from "@/data/content";
import { getCarListingByHandle } from "@/data/listings";

// TODO: fetch from api or from listing data
const CHECKLISTS = [
    {
        name: "Policy on driver's age",
        description:
            "The minimum age to drive this car is 25. Please ensure the driver meets this requirement before booking.",
        icon: UserCircleIcon,
    },
    {
        name: "ID type",
        description: "Bring your Valid passport or ID card.",
        icon: IdentityCardIcon,
    },
    {
        name: "Driving licence",
        description:
            "During pick-up, all drivers must provide any one of the license combinations listed below. If not, the booking will be canceled without a refund.",
        icon: SchoolReportCardIcon,
    },
    {
        name: "Deposit payment",
        description:
            "A deposit of £1,000 is required at pick-up. This will be refunded within 5–10 business days after the car is returned undamaged.",
        icon: DollarCircleIcon,
    },
    {
        name: "Vouchers",
        description: "Bring your booking voucher (printed or digital) and a valid photo ID.",
        icon: TicketIcon,
    },
];

// TODO: fetch from api or from listing data
const INCLUDES_DEMO = [
    { name: "Free cancellation up to 48 hours" },
    { name: "Collision Damage Waiver with £214 deductible" },
    { name: "Theft Protection with £19,999 excess" },
    { name: "Unlimited mileage" },
    { name: "Car interiors and exteriors cleaned with disinfectant before pick-up" },
    { name: "Masks are required at the pick-up location" },
    { name: "24/7 roadside assistance" },
    { name: "Free Wi-Fi in the car" },
    { name: "GPS navigation system included" },
    { name: "Child safety seat available upon request" },
];

export default function CarDetailPage({ params, searchParams }: RouteProps) {
    const handle = params.handle ?? "";

    // getCarListingByHandle falls back to the first listing for an unknown handle
    // and calls notFound() only on an empty catalogue — no missing-listing branch.
    const listing = getCarListingByHandle(handle);
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
                        <SectionHeading>Included in the price </SectionHeading>

                        {/* 6 */}
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            {INCLUDES_DEMO.map((item) => (
                                <div key={item.name} className="flex items-center gap-x-3 text-sm">
                                    <HugeiconsIcon icon={CheckmarkCircle01Icon} size={24} className="mt-px shrink-0" />
                                    <span>{item.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <Divider className="my-8 xl:my-12" />
                    <div className="listingSection__wrap">
                        <SectionHeading>Pick up and drop off </SectionHeading>
                        <div className="flex gap-x-4">
                            <div className="flex shrink-0 flex-col items-center py-2">
                                <span className="block size-6 rounded-full border border-border shadow-xl"></span>
                                <span className="my-1 block grow border-l border-dashed border-border"></span>
                                <span className="block size-6 rounded-full border border-border shadow-xl"></span>
                            </div>
                            <div className="flex flex-col gap-y-14 text-sm">
                                <div>
                                    <p>Tue, Mar 24, 12:00pm</p>
                                    <p className="mt-2 font-medium">Haneda Airport store</p>
                                </div>
                                <div>
                                    <p>Tue, Mar 31, 12:00pm</p>
                                    <p className="mt-2 font-medium">Haneda Airport store</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <Divider className="my-8 xl:my-12" />
                    <div className="listingSection__wrap">
                        <SectionHeading>Important info</SectionHeading>
                        <div className="flex flex-col gap-8">
                            {CHECKLISTS.map((item, index) => (
                                <div key={index} className="flex items-start gap-4 sm:gap-8">
                                    <HugeiconsIcon icon={item.icon} size={24} className="shrink-0" />
                                    <div className="max-w-md text-sm/5 text-muted-foreground">
                                        <p className="font-medium text-foreground">{item.name}</p>
                                        <p className="mt-1">{item.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <Divider className="my-8 xl:my-12" />
                    <div className="listingSection__wrap">
                        <SectionHeading>Rental policies</SectionHeading>
                        <DescriptionList>
                            <DescriptionTerm>Cancellation policy</DescriptionTerm>
                            <DescriptionDetails>
                                You will not be charged anything for the rental since the booking was risk-free.
                            </DescriptionDetails>

                            <DescriptionTerm>Age surcharge</DescriptionTerm>
                            <DescriptionDetails>Drivers under 25 will be charged an additional £15.00 per day.</DescriptionDetails>

                            <DescriptionTerm>Deposit after exchange rate</DescriptionTerm>
                            <DescriptionDetails>US£1,000.00 &rarr; CA£1,331.93</DescriptionDetails>

                            <DescriptionTerm>Fee</DescriptionTerm>
                            <DescriptionDetails>£4.79 USD</DescriptionDetails>

                            <DescriptionTerm>Net</DescriptionTerm>
                            <DescriptionDetails>£1,955.00</DescriptionDetails>
                        </DescriptionList>
                    </div>
                </div>

                {/* SIDEBAR */}
                <div className="grow">
                    <div className="sticky top-10">
                        <ReserveBox listing={listing} vertical="car" />
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
