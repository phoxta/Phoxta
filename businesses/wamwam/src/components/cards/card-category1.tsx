import Img from "@/components/media/img";
import AppLink from "@/lib/nav/link";
import type { Category } from "@/types/content";

interface CardCategory1Props {
    className?: string;
    category: Category;
    size?: "large" | "normal";
}

export default function CardCategory1({ className = "", size = "normal", category }: CardCategory1Props) {
    const { count, name, href, thumbnail } = category;
    return (
        <AppLink href={href} className={`flex items-center ${className}`}>
            {/* Inner quotes stay single: the parity checker compares these template literals as raw text. */}
            <div className={`relative shrink-0 ${size === 'large' ? 'size-20' : 'size-12'} me-4 overflow-hidden rounded-lg`}>
                <Img alt={name} fill src={thumbnail || ""} />
            </div>

            <div>
                <h2
                    className={`${
                        size === 'large' ? 'text-lg' : 'text-base'
                    } font-semibold nc-card-title text-neutral-900 dark:text-neutral-100`}
                >
                    {name}
                </h2>
                <span
                    className={`${size === 'large' ? 'text-sm' : 'text-xs'} mt-0.5 block text-neutral-500 dark:text-neutral-400`}
                >
                    {count}+ properties
                </span>
            </div>
        </AppLink>
    );
}
