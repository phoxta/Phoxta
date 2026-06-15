import { Badge } from '@/components/badge'
import { Link } from '@/components/link'
import { TCategory } from '@/data/categories'
import convertNumbThousand from '@/utils/convert-numb-thousand'
import { ArrowUpRightIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Image from 'next/image'
import { FC } from 'react'

export interface CardCategoryBox1Props {
  className?: string
  category: TCategory
}

const CardCategoryBox1: FC<CardCategoryBox1Props> = ({ className, category }) => {
  const { count, name, thumbnail, href, subtitle } = category
  return (
    <Link
      href={href}
      className={clsx(
        'group/card-category-box1 relative flex items-center nc-box-has-hover bg-neutral-50 p-3 sm:p-6 dark:bg-neutral-800',
        className
      )}
    >
      <div className="relative size-24 shrink-0 overflow-hidden rounded-full">
        <Image
          src={thumbnail || ''}
          fill
          alt={name}
          sizes="(max-width: 400px) 100vw, 400px"
          className="object-cover transition-[filter] duration-300 group-hover/card-category-box1:brightness-85"
        />
      </div>
      <div className="ms-4 grow overflow-hidden">
        <h2 className="text-base font-medium">
          <span className="line-clamp-1">{name}</span>
        </h2>
        <span className={`mt-0.5 block text-sm text-neutral-500 dark:text-neutral-400`}>{subtitle}</span>
        <Badge className="mt-2.5" color="zinc">
          +{convertNumbThousand(count)} available
        </Badge>
      </div>

      <div className="absolute inset-e-2.5 top-2.5 flex size-9 items-center justify-center rounded-full bg-white shadow-xs dark:bg-neutral-900">
        <ArrowUpRightIcon className="size-4 rtl:-rotate-90" />
      </div>
    </Link>
  )
}

export default CardCategoryBox1
