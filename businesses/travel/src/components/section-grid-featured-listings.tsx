'use client'

import { TStayListing } from '@/data/listings'
import { useCarouselDotButton } from '@/hooks/use-carousel-dot-buttons'
import avatar2 from '@/images/avatars/Image-1.png'
import avatar1 from '@/images/avatars/Image-2.png'
import avatar3 from '@/images/avatars/Image-3.png'
import { StarAward01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Autoplay from 'embla-carousel-autoplay'
import Fade from 'embla-carousel-fade'
import useEmblaCarousel from 'embla-carousel-react'
import Image from 'next/image'
import Link from 'next/link'
import { FC, ReactNode } from 'react'
import AmenitiesChips from './amenities-chips'
import Avatar from './avatar'
import { Badge } from './badge'
import BtnLikeIcon from './btn-like-icon'
import ButtonLargeWithIcon from './button-large-with-icon'
import { Heading } from './heading'
import StartRating from './start-rating'
import { Text } from './text'

//
interface SectionGridFeaturedListingsProps {
  stayListings: TStayListing[]
  heading?: ReactNode
  description?: string
}

const users = [
  {
    id: 1,
    name: 'Alice',
    avatarUrl: avatar1.src,
  },
  {
    id: 2,
    name: 'Bob',
    avatarUrl: avatar2.src,
  },
  {
    id: 3,
    name: 'Charlie',
    avatarUrl: avatar3.src,
  },
]

const FeaturedListingCard = ({ stay }: { stay: TStayListing }) => {
  const { amenities, title, handle: listingHandle, like, price, reviewStart, reviewCount, nameLocalized } = stay

  return (
    <div className="group/listing relative aspect-6/7 embla__slide basis-full sm:aspect-7/6 lg:aspect-6/7 xl:aspect-7/6">
      <Image
        src={stay.featuredImage}
        alt={stay.title}
        priority
        fill
        className="rounded-2xl object-cover transition-[filter] duration-300 group-hover/listing:brightness-85"
        sizes="(max-width: 1024px) 100vw, 60vw"
      />
      <span className="absolute top-4 left-4 inline-flex items-center gap-x-1.5 rounded-full bg-white px-2.5 py-0.5 text-xs/5 font-medium text-neutral-700">
        Guest favorite
      </span>

      <BtnLikeIcon isLiked={like} className="absolute top-4 right-4 z-1" />

      <div className="absolute inset-x-3 bottom-3 max-w-sm rounded-2xl bg-card p-4 text-card-foreground shadow-lg sm:p-6 lg:bottom-16 lg:-left-16 xl:-left-24">
        <div className="flex items-center justify-between gap-8">
          <h2 className="text-base font-medium capitalize">
            <span className="line-clamp-1">{title}</span>
          </h2>
          {!!reviewStart && <StartRating reviewCount={reviewCount} point={reviewStart} />}
        </div>
        <div className="mt-1 line-clamp-1 text-sm text-neutral-500 dark:text-neutral-400">{nameLocalized}</div>
        <AmenitiesChips data={amenities} className="mt-3.5" />
        <div className="mt-6 flex items-center justify-between">
          <span>
            <span className="text-base font-medium underline">{price}</span>
            <span className="text-sm font-normal text-neutral-500 dark:text-neutral-400"> for 2 nights</span>
          </span>
        </div>
      </div>

      <Link className="absolute inset-0" href={`/stay-listings/${listingHandle}`} />
    </div>
  )
}

const SectionGridFeaturedListings: FC<SectionGridFeaturedListingsProps> = ({
  stayListings = [],
  heading = (
    <>
      Featured listings <span data-slot="italic">of the month</span>
    </>
  ),
  description = 'Our guests love these spots for their spotless rooms, prime locations, and so much more',
}) => {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: 'center',
      containScroll: false,
      duration: 30,
      direction: process.env.NEXT_PUBLIC_THEME_DIR,
    },
    [Autoplay({ playOnInit: true, delay: 4000 }), Fade()]
  )
  const { selectedIndex, scrollSnaps, onDotButtonClick } = useCarouselDotButton(emblaApi)

  return (
    <div className="relative flex flex-col gap-8 overflow-hidden sm:gap-20 lg:flex-row">
      <div className="flex flex-1 flex-col items-start gap-4 self-center sm:gap-8">
        <Badge className="xl:py-1.5 xl:text-sm">
          <HugeiconsIcon icon={StarAward01Icon} size={24} />
          Most highly rated this month
        </Badge>
        <Heading fontSize="text-4xl lg:text-5xl xl:text-6xl" className="max-w-120" level={2}>
          {heading}
        </Heading>
        <Text className="max-w-sm text-muted-foreground">{description}</Text>
        <div className="flex items-center gap-x-2">
          <div className="flex items-center justify-center -space-x-2">
            {users.map((user) => (
              <Avatar key={user.id} src={user.avatarUrl} className="size-7 ring-2 ring-white dark:ring-zinc-900" />
            ))}
          </div>
          <Text className="text-sm text-muted-foreground">
            <span className="font-[450] text-foreground">4.9/5</span> rating from 8K+ reviews
          </Text>
        </div>

        <ButtonLargeWithIcon className="mt-8 max-w-lg" href="/stay-categories/location-name">
          Explore more stays
        </ButtonLargeWithIcon>
      </div>

      <div className="flex-1 embla sm:overflow-visible" ref={emblaRef}>
        <div className="embla__container w-full">
          {stayListings.map((stay) => (
            <FeaturedListingCard key={stay.id} stay={stay} />
          ))}
        </div>

        <div className="embla__dots mt-5 flex items-center justify-center gap-1.5">
          {scrollSnaps.map((_, index) => (
            <button
              key={index}
              onClick={() => onDotButtonClick(index)}
              className={`rounded-full transition-all ${index === selectedIndex ? 'size-2.5 bg-zinc-500' : 'size-2 bg-zinc-200 dark:bg-zinc-700'}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default SectionGridFeaturedListings
