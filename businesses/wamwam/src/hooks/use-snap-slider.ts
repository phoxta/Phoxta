import { useEffect, useState, type RefObject } from "react";

type Debounced = (() => void) & { cancel: () => void };

function debounce(fn: () => void, wait: number): Debounced {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const debounced = (() => {
        if (timer !== undefined) clearTimeout(timer);
        timer = setTimeout(() => {
            timer = undefined;
            fn();
        }, wait);
    }) as Debounced;
    debounced.cancel = () => {
        if (timer !== undefined) clearTimeout(timer);
        timer = undefined;
    };
    return debounced;
}

/**
 * Start/end tracking for a CSS scroll-snap strip whose items carry
 * `.mySnapItem`. Edge detection runs 600 ms after the last scroll event and
 * allows a 50px tolerance; both are the original tuning.
 */
export default function useSnapSlider({ sliderRef }: { sliderRef: RefObject<HTMLDivElement | null> }) {
    const [isAtEnd, setIsAtEnd] = useState(false);
    const [isAtStart, setIsAtStart] = useState(true);

    const getSliderItemSize = () => {
        const itemWidth = sliderRef.current?.querySelector(".mySnapItem")?.clientWidth || 0;
        // In RTL, scrollBy moves the other way.
        return document.dir === "rtl" ? -itemWidth : itemWidth;
    };

    useEffect(() => {
        const slider = sliderRef.current;
        if (!slider) return;

        const handleScroll = debounce(() => {
            const el = sliderRef.current;
            if (!el) return;

            // scrollLeft is negative in RTL.
            if (document.dir === "rtl") {
                setIsAtEnd(-el.scrollLeft + el.clientWidth >= el.scrollWidth - 50);
                setIsAtStart(el.scrollLeft > -50);
            } else {
                setIsAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 50);
                setIsAtStart(el.scrollLeft < 50);
            }
        }, 600);

        slider.addEventListener("scroll", handleScroll);
        return () => {
            handleScroll.cancel();
            slider.removeEventListener("scroll", handleScroll);
        };
    }, [sliderRef]);

    function scrollToNextSlide() {
        sliderRef.current?.scrollBy({ left: getSliderItemSize(), behavior: "smooth" });
    }

    function scrollToPrevSlide() {
        sliderRef.current?.scrollBy({ left: -getSliderItemSize(), behavior: "smooth" });
    }

    return {
        scrollToNextSlide,
        scrollToPrevSlide,
        isAtEnd,
        isAtStart,
    };
}
