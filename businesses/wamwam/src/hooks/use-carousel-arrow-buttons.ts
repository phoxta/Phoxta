import type { EmblaCarouselType } from "embla-carousel";
import { useCallback, useEffect, useState } from "react";

interface UseCarouselArrowButtons {
    prevBtnDisabled: boolean;
    nextBtnDisabled: boolean;
    onPrevButtonClick: () => void;
    onNextButtonClick: () => void;
}

export function useCarouselArrowButtons(emblaApi: EmblaCarouselType | undefined): UseCarouselArrowButtons {
    // Embla owns the scroll state; this tick only forces a re-render so the
    // disabled flags below are re-read from the API.
    const [, setSelectionTick] = useState(0);

    const onPrevButtonClick = useCallback(() => {
        emblaApi?.scrollPrev();
    }, [emblaApi]);

    const onNextButtonClick = useCallback(() => {
        emblaApi?.scrollNext();
    }, [emblaApi]);

    useEffect(() => {
        if (!emblaApi) return;

        const onSelect = () => setSelectionTick((tick) => tick + 1);
        emblaApi.on("reInit", onSelect).on("select", onSelect);
        return () => {
            emblaApi.off("reInit", onSelect).off("select", onSelect);
        };
    }, [emblaApi]);

    return {
        prevBtnDisabled: !emblaApi?.canScrollPrev(),
        nextBtnDisabled: !emblaApi?.canScrollNext(),
        onPrevButtonClick,
        onNextButtonClick,
    };
}
