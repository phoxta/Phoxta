import { Heading } from '@/components/heading'
import { TBlogPost } from '@/data/data'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import { FC, ReactNode } from 'react'
import { Button } from '../button'
import PostCard3 from './post-card3'

//
interface Props {
  className?: string
  posts: TBlogPost[]
  heading?: ReactNode
}

const SectionGridPosts3: FC<Props> = ({
  className = '',
  posts,
  heading = (
    <>
      Travel <span data-slot="italic">tips</span> & <span data-slot="italic">guides</span>
    </>
  ),
}) => {
  return (
    <div className={`relative ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Heading>{heading}</Heading>
        <Button color="light" href="/blog">
          View all news <ArrowRightIcon className="size-4!" />
        </Button>
      </div>

      <div className="mt-11 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:gap-7">
        {posts.map((post) => (
          <PostCard3 key={post.id} post={post} />
        ))}
      </div>
    </div>
  )
}

export default SectionGridPosts3
