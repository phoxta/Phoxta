import Img from "@/components/media/img";
import AppLink from "@/lib/nav/link";
import type { BlogPost } from "@/types/content";
import PostCardMeta from "./post-card-meta";

interface Props {
    className?: string;
    post: BlogPost;
}

export default function PostCard2({ className, post }: Props) {
    const { handle, title, timeToRead, excerpt: description, date, featuredImage: image, author } = post;

    return (
        <div className={`relative flex justify-between gap-x-8 ${className}`}>
            <div className="flex h-full flex-col py-2">
                <h2 className={`block text-base font-semibold nc-card-title`}>
                    {/* The title links to the post, not to a /blog-single route that does not exist. */}
                    <AppLink href={'/blog/' + handle} className="line-clamp-2 capitalize" title={title}>
                        {title}
                    </AppLink>
                </h2>
                <span className="my-3 hidden text-neutral-500 sm:block dark:text-neutral-400">
                    <span className="line-clamp-2">{description}</span>
                </span>
                <span className="mt-4 block text-sm text-neutral-500 sm:hidden">
                    {date} · {timeToRead}
                </span>
                <div className="mt-auto hidden sm:block">
                    <PostCardMeta author={author} date={date || ''} />
                </div>
            </div>

            <AppLink href={'/blog/' + handle} className="relative block h-full w-2/5 shrink-0 sm:w-1/3">
                {image?.src && (
                    <Img alt={title} src={image.src} className="rounded-xl object-cover sm:rounded-3xl" sizes="400px" fill />
                )}
            </AppLink>
        </div>
    );
}
