import { Badge } from '@/components/badge'
import BtnLikeIcon from '@/components/btn-like-icon'
import { TCarListing } from '@/data/listings'
import Image from 'next/image'
import Link from 'next/link'
import { FC } from 'react'
import AmenitiesChips from './amenities-chips'
import StartRating from './start-rating'

interface CarCardProps {
  className?: string
  data: TCarListing
  size?: 'default' | 'small'
}

const CarCard: FC<CarCardProps> = ({ size = 'default', className = '', data }) => {
  const {
    featuredImage,
    title,
    handle: listingHandle,
    like,
    price,
    reviewStart,
    reviewCount,
    amenities,
    address,
    badge,
  } = data

  const listingHref = `/car-listings/${listingHandle}`

  const renderFeaturedImage = () => {
    return (
      <div className="relative w-full">
        <div className="aspect-w-16 mask-b-from-60% mask-b-to-100% aspect-h-9">
          <Image
            fill
            src={featuredImage}
            alt={title}
            sizes="(max-width: 640px) 100vw, 350px"
            className="object-cover"
          />
        </div>
        <BtnLikeIcon
          colorClass="text-white bg-black/20 hover:bg-black/30"
          isLiked={like}
          className="absolute end-3 top-3 z-1"
        />
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
      <div className={size === 'default' ? 'p-4 pt-0' : 'p-2 pt-0'}>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-medium">{title}</h2>
          <StartRating reviewCount={reviewCount} point={reviewStart} />
        </div>

        <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{address}</div>

        <AmenitiesChips className="mt-3.5 max-w-xs" data={amenities} />

        <div className="mt-5">
          <span className="text-base font-medium underline">{price}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400"> / day</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`group relative overflow-hidden rounded-3xl border-2 border-slate-100 bg-white dark:border-neutral-800 dark:bg-neutral-900 ${className}`}
    >
      <div className="flex flex-col">
        {renderFeaturedImage()}
        {renderContent()}
      </div>
      <Link href={listingHref} className="absolute inset-0"></Link>
    </div>
  )
}

export default CarCard
