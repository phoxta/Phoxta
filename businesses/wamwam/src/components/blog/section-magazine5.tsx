import clsx from "clsx";
import type { BlogPost } from "@/types/content";
import PostCard1 from "./post-card1";
import PostCard2 from "./post-card2";

interface SectionMagazine5Props {
    posts: BlogPost[];
    className?: string;
}

export default function SectionMagazine5({ posts, className }: SectionMagazine5Props) {
    const featuredPost = posts[0];
    const otherPosts = posts.slice(1, 4);

    return (
        <div className={clsx('grid gap-8 md:gap-10 lg:grid-cols-2', className)}>
            <PostCard1 post={featuredPost} />
            <div className="grid gap-6 md:gap-8">
                {otherPosts.map((post) => (
                    <PostCard2 key={post.handle} post={post} />
                ))}
            </div>
        </div>
    );
}
