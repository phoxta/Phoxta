import { StarIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";
import { resolveImgSrc } from "@/components/media/img";
import Avatar from "@/components/primitives/avatar";
import type { ListingReview as ListingReviewData } from "@/types/content";

interface ListingReviewProps {
    className?: string;
    /** Historical spelling — it is the prop name the detail and author pages pass. */
    reivew: ListingReviewData;
}

export default function ListingReview({ className = "", reivew }: ListingReviewProps) {
    const { author, authorAvatar, content, date, rating } = reivew;

    return (
        <div className={`flex gap-x-4.5 ${className}`}>
            <div className="pt-0.5">
                {/* Demo avatars are static-import objects, live ones are URLs. */}
                <Avatar className="size-10" src={resolveImgSrc(authorAvatar)} />
            </div>

            <div className="flex-1">
                <div className="flex flex-col">
                    <div className="font-medium">{author}</div>

                    <div className="mt-0.5 flex items-center gap-3 text-gray-500 dark:text-gray-400">
                        <div className="flex items-center">
                            {[0, 1, 2, 3, 4].map((number) => (
                                <StarIcon
                                    key={number}
                                    aria-hidden="true"
                                    className={clsx(
                                        rating > number ? "text-gray-900 dark:text-white" : "text-gray-300 dark:text-gray-500",
                                        "size-3.5 shrink-0",
                                    )}
                                />
                            ))}
                        </div>
                        <div>•</div>
                        <div className="text-sm">{date}</div>
                    </div>

                    {/* Review bodies are HTML; live content is sanitised when the store hydrates it. */}
                    <div
                        className="mt-3.5 max-w-xl text-sm/relaxed text-gray-700 sm:text-base/relaxed dark:text-gray-300"
                        dangerouslySetInnerHTML={{ __html: content }}
                    />
                </div>
            </div>
        </div>
    );
}
