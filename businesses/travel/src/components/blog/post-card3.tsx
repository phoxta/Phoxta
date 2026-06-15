import { TBlogPost } from '@/data/data'
import { ChevronRightIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Image from 'next/image'
import Link from 'next/link'
import { FC } from 'react'
import { Badge } from '../badge'

interface Props {
  className?: string
  post: TBlogPost
}

const PostCard3: FC<Props> = ({ className, post }) => {
  const { handle, title, date, featuredImage } = post

  return (
    <div
      className={clsx(
        className,
        'relative flex flex-col overflow-hidden rounded-2xl border-2 border-neutral-50 dark:border-neutral-800'
      )}
    >
      <div className="relative aspect-4/3 mask-b-from-55% mask-b-to-100%">
        {featuredImage?.src && (
          <Image
            src={featuredImage}
            alt={title || ''}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        )}
      </div>

      <div className="flex flex-col p-5 pt-0">
        <h2 className="block text-lg font-medium">
          <Link href={'/blog/' + handle} className="absolute inset-0"></Link>
          <span className="">{title}</span>
        </h2>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm font-normal text-neutral-500 dark:text-neutral-400">{date}</span>
          <Badge>Products</Badge>
        </div>
        <p className="mt-2 flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400">
          Read blog
          <ChevronRightIcon className="size-4" />
        </p>
      </div>
    </div>
  )
}

export default PostCard3
