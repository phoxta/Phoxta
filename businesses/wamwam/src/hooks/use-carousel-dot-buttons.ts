import type { EmblaCarouselType } from "embla-carousel";
import { useCallback, useEffect, useState } from "react";

interface UseCarouselDotButton {
    selectedIndex: number;
    scrollSnaps: number[];
    onDotButtonClick: (index: number) => void;
}

export function useCarouselDotButton(emblaApi: EmblaCarouselType | undefined): UseCarouselDotButton {
    // Embla owns the scroll state; this tick only forces a re-render so the
    // selected snap below is re-read from the API.
    const [, setSelectionTick] = useState(0);

    const onDotButtonClick = useCallback(
        (index: number) => {
            emblaApi?.scrollTo(index);
        },
        [emblaApi],
    );

    useEffect(() => {
        if (!emblaApi) return;

        const onSelect = () => setSelectionTick((tick) => tick + 1);
        emblaApi.on("reInit", onSelect).on("select", onSelect);
        return () => {
            emblaApi.off("reInit", onSelect).off("select", onSelect);
        };
    }, [emblaApi]);

    return {
        selectedIndex: emblaApi?.selectedScrollSnap() ?? 0,
        scrollSnaps: emblaApi?.scrollSnapList() ?? [],
        onDotButtonClick,
    };
}
