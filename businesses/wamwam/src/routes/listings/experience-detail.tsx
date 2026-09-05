import { CheckmarkCircle01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { RouteProps } from "@/app/route-renderer";
import ReserveBox from "@/components/listing/reserve-box";
import { SectionFeaturedAmenities } from "@/components/listing/section-featured-amenities";
import HeaderGallery from "@/components/listing/header-gallery";
import SectionHeader from "@/components/listing/section-header";
import { SectionHeading } from "@/components/listing/section-heading";
import SectionHost from "@/components/listing/section-host";
import SectionListingReviews from "@/components/listing/section-listing-reviews";
import SectionMap from "@/components/listing/section-map";
import Img from "@/components/media/img";
import { Divider } from "@/components/primitives/divider";
import { getListingReviews } from "@/data/content";
import { getExperienceListingByHandle } from "@/data/listings";

interface ThingToDo {
    name: string;
    time: string;
    description: string;
    imageUrl: string;
}

// TODO: fetch from api or from listing data
const THINGS_TO_DO: ThingToDo[] = [
    {
        name: "The Ritz London",
        time: "7:30 AM - 8:00 AM",
        description: "Your friendly local London guide will meet you at The Ritz.",
        imageUrl: "/images/catalog/7245327-1200.webp",
    },
    {
        name: "Buckingham Palace",
        time: "10:30 AM - 12:15 PM",
        description:
            "Begin your tour strolling through Green Park to Buckingham Palace, where you can watch the iconic Changing of the Guard.",
        imageUrl: "/images/catalog/31258524-1200.webp",
    },
    {
        name: "Explore Westminster",
        time: "12:15 PM - 1:30 PM",
        description:
            "You will see Big Ben, the Houses of Parliament, Trafalgar Square, Whitehall, Parliament Square, Churchill’s WW2 Bunker & more!.",
        imageUrl: "/images/catalog/24739934-1200.webp",
    },
    {
        name: "Take the Underground to South Bank",
        time: "1:30 PM - 3:30 PM",
        description:
            "Explore Shakespeare's Globe, Borough Market, and The Shard. Please bring a contactless card for this journey.",
        imageUrl: "/images/catalog/31404330-1200.webp",
    },
    {
        name: "Discover London Bridge Area",
        time: "3:45 PM - 5:30 PM",
        description:
            "We'll see Potter film locations (Millennium Bridge), The Clink Prison, London Bridge, HMS Belfast, Tower Bridge, and the Tower of London.",
        imageUrl: "/images/catalog/16725180-1200.webp",
    },
];

// TODO: fetch from api or from listing data
const INCLUDES_DEMO = [
    { name: "Set Menu Lunch on boat" },
    { name: "Express Bus From London" },
    { name: "Mineral Water On Express Bus" },
    { name: "Kayak or Bamboo Boat. Life Jacket." },
    { name: "Big Ben Entrance Ticket" },
    { name: "English Speaking Tour Guide" },
];

export default function ExperienceDetailPage({ params, searchParams }: RouteProps) {
    const handle = params.handle ?? "";

    // getExperienceListingByHandle falls back to the first listing for an unknown
    // handle and calls notFound() only on an empty catalogue, so there is no
    // missing-listing branch left to guard here.
    const listing = getExperienceListingByHandle(handle);
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
            <HeaderGallery images={galleryImgs} gridType="grid4" />

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
                        <SectionHeading>Description</SectionHeading>
                        <div className="leading-relaxed text-muted-foreground">{listing.description}</div>
                        <SectionHeading>What you’ll do</SectionHeading>
                        <div className="flex flex-col gap-8">
                            {THINGS_TO_DO.map((item, index) => (
                                <div key={index} className="flex items-start gap-4 sm:items-center sm:gap-8">
                                    <div className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-xl">
                                        <Img fill src={item.imageUrl} alt="" className="object-cover shadow-inner" />
                                    </div>
                                    <div className="max-w-md text-sm/5 text-muted-foreground">
                                        <p>{item.time}</p>
                                        <p className="mt-2 font-medium text-foreground">{item.name}</p>
                                        <p className="mt-1">{item.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Divider className="my-8 xl:my-12" />

                    <div className="listingSection__wrap">
                        <SectionHeading>Included in the price </SectionHeading>

                        {/* 6 */}
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            {INCLUDES_DEMO.map((item) => (
                                <div key={item.name} className="flex items-center gap-x-3">
                                    <HugeiconsIcon icon={CheckmarkCircle01Icon} size={24} className="mt-px shrink-0" />
                                    <span>{item.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* SIDEBAR */}
                <div className="grow">
                    <div className="sticky top-10">
                        <ReserveBox listing={listing} vertical="experience" />
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
