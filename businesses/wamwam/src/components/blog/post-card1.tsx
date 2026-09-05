import clsx from "clsx";
import Img from "@/components/media/img";
import AppLink from "@/lib/nav/link";
import type { BlogPost } from "@/types/content";
import PostCardMeta from "./post-card-meta";

interface Props {
    className?: string;
    post: BlogPost;
    size?: "sm" | "md";
}

export default function PostCard1({ className = "h-full", post, size = "md" }: Props) {
    const { handle, title, excerpt: description, date, featuredImage: image, author } = post;

    return (
        <div
            className={clsx(
                className,
                'flex flex-col',

                size === 'md' && 'gap-y-10',
                size === 'sm' && 'gap-y-6'
            )}
        >
            <AppLink href={'/blog/' + handle} title={title} className="relative block aspect-4/3 overflow-hidden rounded-3xl">
                {image?.src && (
                    <Img src={image.src} alt={title || ''} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
                )}
            </AppLink>

            <div className="mt-auto flex flex-col">
                <h2
                    className={clsx(
                        'block font-semibold text-neutral-900 dark:text-neutral-100',
                        size === 'sm' && 'text-base sm:text-xl',
                        size === 'md' && 'text-lg sm:text-2xl'
                    )}
                >
                    <AppLink href={'/blog/' + handle} className="line-clamp-1">
                        {title}
                    </AppLink>
                </h2>
                <p className="mt-4 line-clamp-2 text-neutral-500 dark:text-neutral-400">{description}</p>
                <PostCardMeta author={author} date={date || ''} className="mt-5" />
            </div>
        </div>
    );
}
