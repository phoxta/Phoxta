import { HugeiconsIcon } from "@hugeicons/react";
import { SOCIALS_COMPACT, type SocialLink } from "@/data/socials";
import AppLink from "@/lib/nav/link";

interface SocialsList1Props {
    className?: string;
    socials?: SocialLink[];
}

export default function SocialsList1({ className = "gap-y-2.5", socials = SOCIALS_COMPACT }: SocialsList1Props) {
    return (
        <div className={className}>
            {socials.map((item) => (
                <AppLink
                    href={item.href}
                    className="group flex items-center gap-x-2 text-2xl leading-none text-neutral-700 hover:text-black dark:text-neutral-300 dark:hover:text-white"
                    key={item.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Share on ${item.name}`}
                    aria-label={`Share on ${item.name}`}
                >
                    <HugeiconsIcon icon={item.icon} size={24} color="currentColor" strokeWidth={1.5} />
                    <span className="hidden text-sm lg:block">{item.name}</span>
                </AppLink>
            ))}
        </div>
    );
}
