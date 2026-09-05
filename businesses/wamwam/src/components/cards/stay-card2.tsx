import clsx from "clsx";
import AmenitiesChips from "@/components/cards/amenities-chips";
import BtnLikeIcon from "@/components/cards/btn-like-icon";
import StartRating from "@/components/cards/start-rating";
import GallerySlider from "@/components/media/gallery-slider";
import { Badge } from "@/components/primitives/badge";
import AppLink from "@/lib/nav/link";
import type { StayListing } from "@/types/listings";

interface StayCard2Props {
    className?: string;
    data: StayListing;
    size?: "default" | "small";
    ratioClassName?: string;
}

export default function StayCard2({
    size = "default",
    className,
    ratioClassName = "aspect-w-12 aspect-h-11",
    data,
}: StayCard2Props) {
    const {
        galleryImgs,
        title,
        handle: listingHandle,
        like,
        price,
        reviewStart,
        reviewCount,
        amenities,
        nameLocalized,
        badge,
    } = data;

    const listingHref = `/stay-listings/${listingHandle}`;

    return (
        <div className={`group relative ${className}`}>
            <div className="relative w-full">
                <GallerySlider ratioClass={ratioClassName} galleryImgs={galleryImgs} href={listingHref} />
                <BtnLikeIcon isLiked={like} className="absolute end-3 top-3 z-1" />
                {badge && (
                    <Badge color="white" className="absolute start-3 top-3">
                        {badge}
                    </Badge>
                )}
            </div>
            <AppLink href={listingHref}>
                <div className={clsx(size === "default" ? "mt-3.5" : "mt-2.5", "px-2")}>
                    <div className="flex items-center justify-between gap-4">
                        <h2 className="text-base font-medium capitalize">
                            <span className="line-clamp-1">{title}</span>
                        </h2>
                        {!!reviewStart && <StartRating reviewCount={reviewCount} point={reviewStart} />}
                    </div>
                    <div className="mt-1 line-clamp-1 text-sm text-neutral-500 dark:text-neutral-400">{nameLocalized}</div>
                    <AmenitiesChips data={amenities} className="mt-3.5 max-w-xs" />
                    <div className="mt-5">
                        <span className="text-base font-medium underline">{price}</span>
                        <span className="text-sm font-normal text-neutral-500 dark:text-neutral-400"> for 2 nights</span>
                    </div>
                </div>
            </AppLink>
        </div>
    );
}
