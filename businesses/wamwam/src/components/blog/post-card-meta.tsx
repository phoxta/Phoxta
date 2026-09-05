import Avatar from "@/components/primitives/avatar";
import AppLink from "@/lib/nav/link";
import type { BlogAuthor } from "@/types/content";

interface PostCardMetaProps {
    className?: string;
    hiddenAvatar?: boolean;
    author: BlogAuthor;
    date: string;
}

/** Author + date byline used by the blog post cards. */
export default function PostCardMeta({
    className = "leading-none",
    hiddenAvatar = false,
    author,
    date,
}: PostCardMetaProps) {
    return (
        <div className={`inline-flex flex-wrap items-center text-sm text-neutral-800 dark:text-neutral-200 ${className}`}>
            <AppLink href={'/blog'} className="relative flex shrink-0 items-center space-x-2">
                {!hiddenAvatar && <Avatar src={author?.avatar.src} className="h-7 w-7 text-sm" />}
                <span className="block font-medium text-neutral-600 hover:text-black dark:text-neutral-300 dark:hover:text-white">
                    {author?.name}
                </span>
            </AppLink>
            <>
                <span className="mx-[6px] font-medium text-neutral-500 dark:text-neutral-400">·</span>
                <span className="line-clamp-1 font-normal text-neutral-500 dark:text-neutral-400">{date}</span>
            </>
        </div>
    );
}
