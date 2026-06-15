'use client'
import { getGroupStayCategories } from '@/data/categories'
import { ICONS_MAP } from '@/data/data'
import { useCarouselArrowButtons } from '@/hooks/use-carousel-arrow-buttons'
import { HugeiconsIcon } from '@hugeicons/react'
import type { EmblaOptionsType } from 'embla-carousel'
import useEmblaCarousel from 'embla-carousel-react'
import { ReactNode, useState } from 'react'
import { Button } from './button'
import CarouselCategories from './carousel-categories'
import { Heading } from './heading'
import NextPrevButtons from './next-prev-btns'

interface Props {
  emblaOptions?: EmblaOptionsType
  className?: string
  heading?: ReactNode
  groupCategories: Awaited<ReturnType<typeof getGroupStayCategories>>
  cardStyle?: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8'
}

// example data
const ex_group_collections = [
  {
    title: 'Most Popular',
    handle: 'most-popular',
    categories: [
      // list your collection data
    ],
  },
  // ...
]

const SectionGroupCategoriesCarousel = ({
  emblaOptions = {
    slidesToScroll: 'auto',
  },
  className,
  heading = (
    <>
      Explore <span data-slot="italic">popular</span> destinations
    </>
  ),
  groupCategories,
  cardStyle = '8',
}: Props) => {
  // Tạo ref để truy cập các phương thức của carousel
  const [emblaRef, emblaApi] = useEmblaCarousel({
    ...emblaOptions,
    direction: process.env.NEXT_PUBLIC_THEME_DIR,
  })
  const [groupSelected, setGroupSelected] = useState<string>(groupCategories?.[0].handle || '')
  const { prevBtnDisabled, nextBtnDisabled, onPrevButtonClick, onNextButtonClick } = useCarouselArrowButtons(emblaApi)

  return (
    <div className={className}>
      <Heading className="max-w-2xl">{heading}</Heading>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 sm:mt-12">
        <div className="flex flex-wrap gap-2">
          {groupCategories?.map((group) => (
            <Button
              key={group.handle}
              onClick={() => setGroupSelected(group.handle)}
              // @ts-ignore
              outline={groupSelected !== group.handle}
            >
              {ICONS_MAP[group.icon] && <HugeiconsIcon icon={ICONS_MAP[group.icon]} size={20} />}
              {group.title}
            </Button>
          ))}
        </div>

        <NextPrevButtons
          className="ms-auto hidden sm:block xl:ms-0"
          onNextClick={onNextButtonClick}
          onPrevClick={onPrevButtonClick}
          nextBtnDisabled={nextBtnDisabled}
          prevBtnDisabled={prevBtnDisabled}
        />
      </div>

      <CarouselCategories
        className="mt-8"
        emblaRef={emblaRef}
        categories={groupCategories?.find((group) => group.handle === groupSelected)?.categories || []}
        cardStyle={cardStyle}
      />
    </div>
  )
}

export default SectionGroupCategoriesCarousel
