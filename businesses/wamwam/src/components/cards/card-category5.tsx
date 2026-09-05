import Img from "@/components/media/img";
import { convertNumbThousand } from "@/lib/format";
import AppLink from "@/lib/nav/link";
import type { Category } from "@/types/content";

interface CardCategory5Props {
    className?: string;
    category: Category;
}

export default function CardCategory5({ className = "", category }: CardCategory5Props) {
    const { count, name, href, thumbnail } = category;
    return (
        <div className={`group relative flex flex-col ${className}`}>
            <div className="aspect-w-4 relative h-0 w-full shrink-0 overflow-hidden rounded-2xl aspect-h-3">
                <Img
                    fill
                    alt={name}
                    src={thumbnail || ""}
                    className="rounded-2xl object-cover"
                    sizes="(max-width: 400px) 100vw, 400px"
                />
                <span className="absolute inset-0 bg-black/10 opacity-0 transition-opacity group-hover:opacity-100"></span>
            </div>
            <div className="mt-3.5 px-2">
                <h2 className="text-base font-medium text-neutral-900 dark:text-neutral-100">
                    {/* Overlay anchor inside the heading so the whole card is clickable without nesting block content in <a>. */}
                    <AppLink href={href} className="absolute inset-0"></AppLink>
                    <span className="line-clamp-1">{name}</span>
                </h2>
                <span className="mt-1.5 block text-sm text-neutral-600 dark:text-neutral-400">
                    {convertNumbThousand(count)}+ available
                </span>
            </div>
        </div>
    );
}
