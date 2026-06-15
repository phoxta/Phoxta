import Avatar from '@/components/avatar'
import { TAuthor } from '@/data/authors'
import { StarIcon } from '@heroicons/react/24/solid'
import Link from 'next/link'
import { FC } from 'react'

interface CardAuthorBoxProps {
  className?: string
  author: TAuthor
}

const demo_author: TAuthor = {
  id: 999,
  displayName: 'Truelock',
  handle: 'truelock-alric',
  email: 'atruelock0@skype.com',
  gender: 'Bigender',
  avatarUrl: '',
  bgImage: 'https://images.pexels.com/photos/4064835/pexels-photo-4064835.jpeg?auto=compress&cs=tinysrgb&w=500',
  count: 40,
  description:
    'There’s no stopping the tech giant. Apple now opens its 100th store in China.There’s no stopping the tech giant.',
  jobName: 'Manager',
  starRating: 4.9,
  location: 'London, UK',
  timeAsHost: {
    months: 2,
    years: 5,
  },
}

const CardAuthorBox: FC<CardAuthorBoxProps> = ({ className, author = demo_author }) => {
  const { displayName, handle = '/', avatarUrl, starRating, location, timeAsHost } = author
  return (
    <Link
      href={`/authors/${handle}`}
      className={`card-author-box group/card relative flex flex-col items-center justify-center rounded-3xl bg-accent px-3 py-5 text-center sm:p-6 ${className}`}
    >
      <Avatar
        className="size-22 shadow-inner transition-[filter] group-hover/card:brightness-85"
        src={avatarUrl}
        initials={displayName.charAt(0)}
      />
      <div className="mt-4">
        <h2 className={`text-lg font-semibold`}>{displayName}</h2>
        <p className="mt-1 line-clamp-1 block text-xs font-[450] text-neutral-700 dark:text-neutral-400">
          Host in {location}
        </p>
      </div>
      <div className="mt-4 flex w-full items-center justify-between gap-2.5 rounded-xl bg-background px-4 py-2 text-center">
        <div className="flex-1">
          <div className="flex items-center justify-center gap-0.5">
            <StarIcon className="mb-px size-3.5" />
            <p className="text-sm font-semibold">{starRating || 4.9} </p>
          </div>
          <p className="text-[10px] font-[450]">guest rating</p>
        </div>
        <div className="h-7 w-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700"></div>
        <div className="flex-1">
          <p className="text-sm font-semibold">{timeAsHost.years} </p>
          <p className="text-[10px] font-[450]">years hosting</p>
        </div>
      </div>
    </Link>
  )
}

export default CardAuthorBox
