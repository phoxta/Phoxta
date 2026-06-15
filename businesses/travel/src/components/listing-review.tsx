import Avatar from '@/components/avatar'
import { TListingReivew } from '@/data/data'
import { StarIcon } from '@heroicons/react/24/solid'
import clsx from 'clsx'
import { FC } from 'react'

interface Props {
  className?: string
  reivew: TListingReivew
}

const ListingReview: FC<Props> = ({ className = '', reivew }) => {
  const { author, authorAvatar, content, date, rating, title } = reivew

  return (
    <div className={`flex gap-x-4.5 ${className}`}>
      <div className="pt-0.5">
        <Avatar className="size-10" src={authorAvatar.src} />
      </div>

      <div className="flex-1">
        <div className="flex flex-col">
          <div className="font-medium">{author}</div>

          <div className="mt-0.5 flex items-center gap-3 text-gray-500 dark:text-gray-400">
            <div className="flex items-center">
              {[0, 1, 2, 3, 4].map((number) => (
                <StarIcon
                  key={number}
                  aria-hidden="true"
                  className={clsx(
                    rating > number ? 'text-gray-900 dark:text-white' : 'text-gray-300 dark:text-gray-500',
                    'size-3.5 shrink-0'
                  )}
                />
              ))}
            </div>
            <div>•</div>
            <div className="text-sm">{date}</div>
          </div>

          <div
            className="mt-3.5 max-w-xl text-sm/relaxed text-gray-700 sm:text-base/relaxed dark:text-gray-300"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      </div>
    </div>
  )
}

export default ListingReview
