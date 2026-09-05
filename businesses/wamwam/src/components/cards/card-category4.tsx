import Img from "@/components/media/img";
import { convertNumbThousand } from "@/lib/format";
import AppLink from "@/lib/nav/link";
import type { Category } from "@/types/content";

interface CardCategory4Props {
    className?: string;
    category: Category;
}

export default function CardCategory4({ className = "", category }: CardCategory4Props) {
    const { count, name, href, thumbnail } = category;
    return (
        <AppLink href={href} className={`group flex flex-col ${className}`}>
            <div className="aspect-w-5 relative h-0 w-full shrink-0 overflow-hidden rounded-2xl aspect-h-5">
                <Img
                    src={thumbnail || ""}
                    className="rounded-2xl object-cover"
                    fill
                    alt={name}
                    sizes="(max-width: 400px) 100vw, 400px"
                />
                <span className="absolute inset-0 bg-black/10 opacity-0 transition-opacity group-hover:opacity-100"></span>
            </div>
            <div className="mt-4 truncate px-2">
                <h2 className="truncate text-base font-medium text-neutral-900 lg:text-lg dark:text-neutral-100">{name}</h2>
                <span className="mt-1 block text-sm text-neutral-600 dark:text-neutral-400">
                    {convertNumbThousand(count || 0)}+ available
                </span>
            </div>
        </AppLink>
    );
}
