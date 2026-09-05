import { Heading } from "@/components/primitives/heading";
import {
    Pagination,
    PaginationList,
    PaginationNext,
    PaginationPage,
    PaginationPrevious,
} from "@/components/primitives/pagination";
import type { BlogPost } from "@/types/content";
import PostCard3 from "./post-card3";

interface SectionGridPostsProps {
    className?: string;
    posts: BlogPost[];
}

export default function SectionGridPosts({ className = "", posts }: SectionGridPostsProps) {
    return (
        <div className={`relative ${className}`}>
            <Heading>
                Latest <span data-slot="italic">articles</span>
            </Heading>
            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-y-12 lg:grid-cols-3 xl:grid-cols-4">
                {posts.map((post) => (
                    <PostCard3 key={post.id} post={post} />
                ))}
            </div>
            <div className="mt-16 flex justify-center">
                <Pagination className="mx-auto">
                    <PaginationPrevious href="?page=1" />
                    <PaginationList>
                        <PaginationPage href="?page=1" current>
                            1
                        </PaginationPage>
                        <PaginationPage href="?page=2">2</PaginationPage>
                        <PaginationPage href="?page=3">3</PaginationPage>
                        <PaginationPage href="?page=4">4</PaginationPage>
                    </PaginationList>
                    <PaginationNext href="?page=3" />
                </Pagination>
            </div>
        </div>
    );
}
