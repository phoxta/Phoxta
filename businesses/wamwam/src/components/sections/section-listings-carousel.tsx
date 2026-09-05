import CarCard from '@/components/cards/car-card'
import ExperiencesCard from '@/components/cards/experiences-card'
import StayCard2 from '@/components/cards/stay-card2'
import { useDirection } from '@/components/primitives/direction'
import { Heading } from '@/components/primitives/heading'
import NextPrevButtons from '@/components/primitives/next-prev-btns'
import { Text } from '@/components/primitives/text'
import { useCarouselArrowButtons } from '@/hooks/use-carousel-arrow-buttons'
import type { CarListing, ExperienceListing, StayListing } from '@/types/listings'
import type { EmblaOptionsType } from 'embla-carousel'
import useEmblaCarousel from 'embla-carousel-react'
import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures'

interface Props {
  emblaOptions?: EmblaOptionsType
  className?: string
  heading?: string
  headingFontClassName?: string
  subHeading?: string
  listings: StayListing[] | ExperienceListing[] | CarListing[]
  cardType?: 'stay' | 'experience' | 'car'
}

export default function SectionListingsCarousel({
  className,
  heading = `Popular homes <span data-slot="italic">in London</span>`,
  listings,
  headingFontClassName,
  subHeading,
  cardType = 'stay',
}: Props) {
  const direction = useDirection()
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: false,
      skipSnaps: true,
      slidesToScroll: 'auto',
      direction,
    },
    [WheelGesturesPlugin()]
  )
  const { prevBtnDisabled, nextBtnDisabled, onPrevButtonClick, onNextButtonClick } = useCarouselArrowButtons(emblaApi)

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          {/* The heading is an HTML string so callers can place the <span data-slot="italic"> accent. */}
          <Heading
            className="max-w-3xl"
            fontSize={headingFontClassName}
            dangerouslySetInnerHTML={{ __html: heading }}
          />
          {subHeading && <Text className="mt-3 text-muted-foreground">{subHeading}</Text>}
        </div>

        <NextPrevButtons
          className="ms-auto hidden sm:block xl:ms-0"
          onNextClick={onNextButtonClick}
          onPrevClick={onPrevButtonClick}
          nextBtnDisabled={nextBtnDisabled}
          prevBtnDisabled={prevBtnDisabled}
        />
      </div>

      <div className="mt-8 embla sm:mt-10" ref={emblaRef}>
        <div className="-ms-4 embla__container sm:-ms-6">
          {listings.map((listing) => (
            <div
              key={listing.id}
              className="embla__slide basis-[86%] ps-4 sm:ps-6 md:basis-[45%] lg:basis-1/3 xl:basis-[29%] 2xl:basis-1/4"
            >
              {cardType === 'stay' && <StayCard2 data={listing as StayListing} />}
              {cardType === 'experience' && <ExperiencesCard data={listing as ExperienceListing} />}
              {cardType === 'car' && <CarCard data={listing as CarListing} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
