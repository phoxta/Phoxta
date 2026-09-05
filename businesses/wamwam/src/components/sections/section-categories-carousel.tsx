import CarouselCategories from '@/components/cards/carousel-categories'
import { useDirection } from '@/components/primitives/direction'
import { Heading } from '@/components/primitives/heading'
import NextPrevButtons from '@/components/primitives/next-prev-btns'
import { useCarouselArrowButtons } from '@/hooks/use-carousel-arrow-buttons'
import type { Category } from '@/types/content'
import type { EmblaOptionsType } from 'embla-carousel'
import useEmblaCarousel from 'embla-carousel-react'
import type { ReactNode } from 'react'

interface Props {
  emblaOptions?: EmblaOptionsType
  className?: string
  heading?: ReactNode
  categories: Category[]
  cardStyle?: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8'
}

export default function SectionCategoriesCarousel({
  emblaOptions = {
    slidesToScroll: 'auto',
  },
  className,
  heading = (
    <>
      Inspiration for <span data-slot="italic">future</span> getaways
    </>
  ),
  categories,
  cardStyle = '8',
}: Props) {
  // Embla takes direction as an option rather than reading the DOM; the root
  // DirectionProvider is the single source of truth for it.
  const direction = useDirection()
  const [emblaRef, emblaApi] = useEmblaCarousel({
    ...emblaOptions,
    direction,
  })
  const { prevBtnDisabled, nextBtnDisabled, onPrevButtonClick, onNextButtonClick } = useCarouselArrowButtons(emblaApi)

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Heading className="max-w-2xl">{heading}</Heading>

        <NextPrevButtons
          className="ms-auto hidden sm:block xl:ms-0"
          onNextClick={onNextButtonClick}
          onPrevClick={onPrevButtonClick}
          nextBtnDisabled={nextBtnDisabled}
          prevBtnDisabled={prevBtnDisabled}
        />
      </div>

      <CarouselCategories className="mt-8 sm:mt-10" emblaRef={emblaRef} categories={categories} cardStyle={cardStyle} />
    </div>
  )
}
