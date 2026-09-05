import { HugeiconsIcon } from "@hugeicons/react";
import { SOCIALS, type SocialLink } from "@/data/socials";
import AppLink from "@/lib/nav/link";
import { cn } from "@/lib/utils";

interface SocialsListProps {
    className?: string;
    itemClass?: string;
    socials?: SocialLink[];
}

export default function SocialsList({ className, itemClass = "block", socials = SOCIALS }: SocialsListProps) {
    return (
        <nav className={cn("flex flex-wrap gap-x-3.5 gap-y-2 text-2xl", className)}>
            {socials.map((item) => (
                <AppLink
                    key={item.name}
                    className={itemClass}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={item.name}
                >
                    <HugeiconsIcon icon={item.icon} size={20} />
                </AppLink>
            ))}
        </nav>
    );
}
