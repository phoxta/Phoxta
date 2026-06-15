import { EmblaCarouselType } from 'embla-carousel'
import { useCallback, useEffect, useState } from 'react'

type UseDotButtonType = {
  selectedIndex: number
  scrollSnaps: number[]
  onDotButtonClick: (index: number) => void
}

export const useCarouselDotButton = (emblaApi: EmblaCarouselType | undefined): UseDotButtonType => {
  // Bumped by embla events to re-render; dot state is derived from emblaApi during render
  const [, setSelectionTick] = useState(0)

  const onDotButtonClick = useCallback(
    (index: number) => {
      if (!emblaApi) return
      emblaApi.scrollTo(index)
    },
    [emblaApi]
  )

  useEffect(() => {
    if (!emblaApi) return

    const onSelect = () => setSelectionTick((tick) => tick + 1)
    emblaApi.on('reInit', onSelect).on('select', onSelect)
    return () => {
      emblaApi.off('reInit', onSelect).off('select', onSelect)
    }
  }, [emblaApi])

  return {
    selectedIndex: emblaApi?.selectedScrollSnap() ?? 0,
    scrollSnaps: emblaApi?.scrollSnapList() ?? [],
    onDotButtonClick,
  }
}
