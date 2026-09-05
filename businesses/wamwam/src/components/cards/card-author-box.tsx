import { StarIcon } from "@heroicons/react/24/solid";
import Avatar from "@/components/primitives/avatar";
import AppLink from "@/lib/nav/link";
import type { Author } from "@/types/content";

interface CardAuthorBoxProps {
    className?: string;
    author: Author;
}

/** Rendered when a caller passes no author — a stand-in with an empty avatar so the initial shows. */
const DEMO_AUTHOR: Author = {
    id: 999,
    displayName: "Truelock",
    handle: "truelock-alric",
    email: "atruelock0@skype.com",
    gender: "Bigender",
    avatarUrl: "",
    bgImage: "/images/catalog/4064835-500.webp",
    count: 40,
    description:
        "There’s no stopping the tech giant. Apple now opens its 100th store in China.There’s no stopping the tech giant.",
    jobName: "Manager",
    starRating: 4.9,
    location: "London, UK",
    timeAsHost: {
        months: 2,
        years: 5,
    },
};

export default function CardAuthorBox({ className, author = DEMO_AUTHOR }: CardAuthorBoxProps) {
    const { displayName, handle, avatarUrl, starRating, location, timeAsHost } = author;
    return (
        <AppLink
            href={`/authors/${handle}`}
            className={`card-author-box group/card relative flex flex-col items-center justify-center rounded-3xl bg-accent px-3 py-5 text-center sm:p-6 ${className}`}
        >
            <Avatar
                className="size-22 shadow-inner transition-[filter] group-hover/card:brightness-85"
                src={avatarUrl}
                initials={displayName.charAt(0)}
            />
            <div className="mt-4">
                <h2 className="text-lg font-semibold">{displayName}</h2>
                <p className="mt-1 line-clamp-1 block text-xs font-[450] text-neutral-700 dark:text-neutral-400">
                    Host in {location}
                </p>
            </div>
            <div className="mt-4 flex w-full items-center justify-between gap-2.5 rounded-xl bg-background px-4 py-2 text-center">
                <div className="flex-1">
                    <div className="flex items-center justify-center gap-0.5">
                        <StarIcon className="mb-px size-3.5" />
                        <p className="text-sm font-semibold">{starRating || 4.9} </p>
                    </div>
                    <p className="text-[10px] font-[450]">guest rating</p>
                </div>
                <div className="h-7 w-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700"></div>
                <div className="flex-1">
                    <p className="text-sm font-semibold">{timeAsHost.years} </p>
                    <p className="text-[10px] font-[450]">years hosting</p>
                </div>
            </div>
        </AppLink>
    );
}
