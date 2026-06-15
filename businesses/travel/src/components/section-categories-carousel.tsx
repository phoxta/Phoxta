'use client'
import { TCategory } from '@/data/categories'
import { useCarouselArrowButtons } from '@/hooks/use-carousel-arrow-buttons'
import type { EmblaOptionsType } from 'embla-carousel'
import useEmblaCarousel from 'embla-carousel-react'
import { ReactNode } from 'react'
import CarouselCategories from './carousel-categories'
import { Heading } from './heading'
import NextPrevButtons from './next-prev-btns'

interface Props {
  emblaOptions?: EmblaOptionsType
  className?: string
  heading?: ReactNode
  categories: TCategory[]
  cardStyle?: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8'
}

const SectionCategoriesCarousel = ({
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
}: Props) => {
  // Tạo ref để truy cập các phương thức của carousel
  const [emblaRef, emblaApi] = useEmblaCarousel({
    ...emblaOptions,
    direction: process.env.NEXT_PUBLIC_THEME_DIR,
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

export default SectionCategoriesCarousel
