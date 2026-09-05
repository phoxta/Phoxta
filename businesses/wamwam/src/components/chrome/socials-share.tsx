import { HugeiconsIcon } from "@hugeicons/react";
import clsx from "clsx";
import { SOCIALS, type SocialLink } from "@/data/socials";
import AppLink from "@/lib/nav/link";

/** Kept for importers that typed their own lists against the old name. */
export type SocialType = SocialLink;

interface SocialsShareProps {
    className?: string;
    itemClass?: string;
    socials?: SocialLink[];
}

export default function SocialsShare({ className, itemClass = "", socials = SOCIALS }: SocialsShareProps) {
    return (
        <div className={clsx("flex w-48 flex-col rounded-xl border bg-popover px-4 py-2.5", className)}>
            {socials.map((item) => (
                <AppLink
                    key={item.name}
                    href={item.href}
                    className={`-mx-2 flex items-center gap-x-2.5 rounded-lg p-2.5 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-neutral-700 ${itemClass}`}
                    title={`Share on ${item.name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <HugeiconsIcon icon={item.icon} size={24} color="currentColor" strokeWidth={1.5} />
                    <p className="text-sm">{item.name}</p>
                </AppLink>
            ))}
        </div>
    );
}
