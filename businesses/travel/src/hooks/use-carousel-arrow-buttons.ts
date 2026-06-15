import { EmblaCarouselType } from 'embla-carousel'
import { useCallback, useEffect, useState } from 'react'

type UsePrevNextButtonsType = {
  prevBtnDisabled: boolean
  nextBtnDisabled: boolean
  onPrevButtonClick: () => void
  onNextButtonClick: () => void
}

export const useCarouselArrowButtons = (emblaApi: EmblaCarouselType | undefined): UsePrevNextButtonsType => {
  // Bumped by embla events to re-render; button state is derived from emblaApi during render
  const [, setSelectionTick] = useState(0)

  const onPrevButtonClick = useCallback(() => {
    if (!emblaApi) return
    emblaApi.scrollPrev()
  }, [emblaApi])

  const onNextButtonClick = useCallback(() => {
    if (!emblaApi) return
    emblaApi.scrollNext()
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return

    const onSelect = () => setSelectionTick((tick) => tick + 1)
    emblaApi.on('reInit', onSelect).on('select', onSelect)
    return () => {
      emblaApi.off('reInit', onSelect).off('select', onSelect)
    }
  }, [emblaApi])

  return {
    prevBtnDisabled: !emblaApi?.canScrollPrev(),
    nextBtnDisabled: !emblaApi?.canScrollNext(),
    onPrevButtonClick,
    onNextButtonClick,
  }
}
