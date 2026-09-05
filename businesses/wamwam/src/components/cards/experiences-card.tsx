import AmenitiesChips from "@/components/cards/amenities-chips";
import BtnLikeIcon from "@/components/cards/btn-like-icon";
import StartRating from "@/components/cards/start-rating";
import Img from "@/components/media/img";
import { Badge } from "@/components/primitives/badge";
import AppLink from "@/lib/nav/link";
import type { ExperienceListing } from "@/types/listings";

interface ExperiencesCardProps {
    className?: string;
    data: ExperienceListing;
    size?: "default" | "small";
}

export default function ExperiencesCard({ size = "default", className = "", data }: ExperiencesCardProps) {
    const {
        address,
        title,
        handle: listingHandle,
        like,
        price,
        reviewStart,
        reviewCount,
        amenities,
        featuredImage,
        badge,
    } = data;

    const listingHref = `/experience-listings/${listingHandle}`;

    return (
        <div
            className={`group relative overflow-hidden rounded-3xl border-2 border-slate-100 bg-white dark:border-neutral-800 dark:bg-neutral-900 ${className}`}
        >
            <div className="flex flex-col">
                <div className="relative w-full">
                    <div className="aspect-4/3 mask-b-from-60% mask-b-to-100%">
                        <Img
                            fill
                            src={featuredImage}
                            alt={title}
                            sizes="(max-width: 640px) 100vw, 350px"
                            className="object-cover"
                        />
                    </div>
                    <BtnLikeIcon isLiked={like} className="absolute top-3 right-3 z-1" />
                    {badge && (
                        <Badge color="white" className="absolute start-3 top-3">
                            {badge}
                        </Badge>
                    )}
                </div>
                <div className={size === "default" ? "p-4 pt-0" : "p-2 pt-0"}>
                    <h2 className="text-lg font-medium">{title}</h2>
                    <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{address}</div>

                    <AmenitiesChips className="mt-3.5 max-w-xs" data={amenities} />

                    <div className="mt-5 flex items-center justify-between gap-2">
                        <div>
                            <span className="text-base font-medium underline">{price}</span>
                            <span className="text-sm text-gray-500 dark:text-gray-400"> / guest</span>
                        </div>
                        <StartRating reviewCount={reviewCount} point={reviewStart} />
                    </div>
                </div>
            </div>
            {/* The whole card is the link; the overlay anchor keeps the heading/price markup plain. */}
            <AppLink href={listingHref} className="absolute inset-0"></AppLink>
        </div>
    );
}
