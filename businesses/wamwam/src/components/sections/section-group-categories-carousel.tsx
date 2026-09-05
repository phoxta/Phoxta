import CarouselCategories from '@/components/cards/carousel-categories'
import { Button } from '@/components/primitives/button'
import { useDirection } from '@/components/primitives/direction'
import { Heading } from '@/components/primitives/heading'
import NextPrevButtons from '@/components/primitives/next-prev-btns'
import { ICONS_MAP } from '@/data/icons'
import { useCarouselArrowButtons } from '@/hooks/use-carousel-arrow-buttons'
import type { CategoryGroup } from '@/types/content'
import { HugeiconsIcon } from '@hugeicons/react'
import type { EmblaOptionsType } from 'embla-carousel'
import useEmblaCarousel from 'embla-carousel-react'
import { useState, type ReactNode } from 'react'

interface Props {
  emblaOptions?: EmblaOptionsType
  className?: string
  heading?: ReactNode
  groupCategories: CategoryGroup[]
  cardStyle?: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8'
}

export default function SectionGroupCategoriesCarousel({
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
}: Props) {
  const direction = useDirection()
  const [emblaRef, emblaApi] = useEmblaCarousel({
    ...emblaOptions,
    direction,
  })
  const [groupSelected, setGroupSelected] = useState<string>(groupCategories[0]?.handle || '')
  const { prevBtnDisabled, nextBtnDisabled, onPrevButtonClick, onNextButtonClick } = useCarouselArrowButtons(emblaApi)

  return (
    <div className={className}>
      <Heading className="max-w-2xl">{heading}</Heading>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 sm:mt-12">
        <div className="flex flex-wrap gap-2">
          {groupCategories.map((group) => (
            <Button
              key={group.handle}
              onClick={() => setGroupSelected(group.handle)}
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
        categories={groupCategories.find((group) => group.handle === groupSelected)?.categories || []}
        cardStyle={cardStyle}
      />
    </div>
  )
}
