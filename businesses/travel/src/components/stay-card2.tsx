import { Badge } from '@/components/badge'
import BtnLikeIcon from '@/components/btn-like-icon'
import GallerySlider from '@/components/gallery-slider'
import StartRating from '@/components/start-rating'
import { TStayListing } from '@/data/listings'
import clsx from 'clsx'
import Link from 'next/link'
import { FC } from 'react'
import AmenitiesChips from './amenities-chips'

interface StayCard2Props {
  className?: string
  data: TStayListing
  size?: 'default' | 'small'
  ratioClassName?: string
}

const StayCard2: FC<StayCard2Props> = ({
  size = 'default',
  className,
  ratioClassName = 'aspect-w-12 aspect-h-11',
  data,
}) => {
  const {
    galleryImgs,
    title,
    handle: listingHandle,
    like,
    price,
    reviewStart,
    reviewCount,
    amenities,
    nameLocalized,
    badge,
  } = data

  const listingHref = `/stay-listings/${listingHandle}`

  const renderSliderGallery = () => {
    return (
      <div className="relative w-full">
        <GallerySlider ratioClass={ratioClassName} galleryImgs={galleryImgs} href={listingHref} />
        <BtnLikeIcon isLiked={like} className="absolute end-3 top-3 z-1" />
        {badge && (
          <Badge color="white" className="absolute start-3 top-3">
            {badge}
          </Badge>
        )}
      </div>
    )
  }

  const renderContent = () => {
    return (
      <div className={clsx(size === 'default' ? 'mt-3.5' : 'mt-2.5', 'px-2')}>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-medium capitalize">
            <span className="line-clamp-1">{title}</span>
          </h2>
          {!!reviewStart && <StartRating reviewCount={reviewCount} point={reviewStart} />}
        </div>
        <div className="mt-1 line-clamp-1 text-sm text-neutral-500 dark:text-neutral-400">{nameLocalized}</div>
        <AmenitiesChips data={amenities} className="mt-3.5 max-w-xs" />
        <div className="mt-5">
          <span className="text-base font-medium underline">{price}</span>
          <span className="text-sm font-normal text-neutral-500 dark:text-neutral-400"> for 2 nights</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`group relative ${className}`}>
      {renderSliderGallery()}
      <Link href={listingHref}>{renderContent()}</Link>
    </div>
  )
}

export default StayCard2
