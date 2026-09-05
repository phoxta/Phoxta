import { StarIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";

interface StartRatingProps {
    className?: string;
    point?: number;
    reviewCount?: number;
    size?: "lg" | "md";
}

export default function StartRating({ className, point = 4.5, reviewCount = 112, size = "md" }: StartRatingProps) {
    return (
        <div
            className={clsx(
                "flex shrink-0 items-center",
                className,
                size === "lg" && "gap-x-1.5 text-base",
                size === "md" && "gap-x-1 text-sm",
            )}
        >
            <div className="pb-0.5">
                <StarIcon className={clsx("", size === "lg" && "size-5", size === "md" && "size-4")} />
            </div>
            <span className="font-medium">{point}</span>
            <span className="">({reviewCount})</span>
        </div>
    );
}
