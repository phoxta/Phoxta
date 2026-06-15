import { TCategory } from '@/data/categories'
import { ArrowUpRightIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Image from 'next/image'
import { Text, TextLink } from './text'

interface CardCategory8Props {
  category: TCategory
  className?: string
  imageRatio?: string
  showArrow?: boolean
}

export default function CardCategory8({
  category,
  className,
  imageRatio = 'aspect-7/8',
  showArrow = true,
}: CardCategory8Props) {
  const { id, name, handle, thumbnail, href } = category

  return (
    <div className={clsx('group/collection relative w-full', className)}>
      <div className={clsx('relative z-0 w-full overflow-hidden rounded-2xl', imageRatio)}>
        <Image
          src={thumbnail || '/placeholder.webp'}
          alt={name}
          fill
          className="z-0 rounded-2xl object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 30vw"
        />

        <span className="absolute inset-0 bg-black/20 opacity-0 transition-opacity group-hover/collection:opacity-100"></span>
      </div>

      <div className="absolute inset-x-4 bottom-4 flex items-center justify-center gap-0.5">
        <div className="flex h-11 grow items-center justify-center rounded-full bg-background px-2.5 text-foreground">
          <Text className="line-clamp-1 text-sm leading-none font-medium">{name}</Text>
        </div>

        {showArrow ? (
          <div className="flex size-11 items-center justify-center rounded-full bg-background text-foreground">
            <ArrowUpRightIcon className="size-4" />
          </div>
        ) : null}
      </div>

      <TextLink href={href}>
        <span className="absolute inset-0"></span>
        <span className="sr-only">{name}</span>
      </TextLink>
    </div>
  )
}
