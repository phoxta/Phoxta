import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { useState } from "react";
import { useSwipeable } from "react-swipeable";
import { ButtonCircle } from "@/components/primitives/button";
import Img, { type ImgSource } from "@/components/media/img";
import AppLink from "@/lib/nav/link";
import { variants } from "@/lib/animation-variants";

interface GallerySliderProps {
    className?: string;
    galleryImgs: (ImgSource | { src: string; width: number; height: number })[];
    ratioClass?: string;
    href?: string;
    imageClass?: string;
    galleryClass?: string;
    navigation?: boolean;
}

export default function GallerySlider({
    className,
    galleryImgs,
    ratioClass = "aspect-w-4 aspect-h-3",
    imageClass,
    galleryClass,
    href = "/stay-listings/the-handle",
    navigation = true,
}: GallerySliderProps) {
    const [loaded, setLoaded] = useState(false);
    const [index, setIndex] = useState(0);
    const [direction, setDirection] = useState(0);
    const images = galleryImgs;

    function changePhotoId(newVal: number) {
        setDirection(newVal > index ? 1 : -1);
        setIndex(newVal);
    }

    const handlers = useSwipeable({
        onSwipedLeft: () => {
            if (index < images?.length - 1) changePhotoId(index + 1);
        },
        onSwipedRight: () => {
            if (index > 0) changePhotoId(index - 1);
        },
        trackMouse: true,
    });

    const currentImage = images[index];

    return (
        <MotionConfig
            transition={{
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
            }}
        >
            <div className={clsx(`group/cardGallerySlider group relative`, className)} {...handlers}>
                {/* Main image */}
                <div className={clsx(`w-full overflow-hidden rounded-2xl`, galleryClass)}>
                    <AppLink href={href} className={clsx(`relative flex items-center justify-center`, ratioClass)}>
                        <AnimatePresence initial={false} custom={direction}>
                            <motion.div
                                key={index}
                                custom={direction}
                                variants={variants(340, 1)}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                className="absolute inset-0"
                            >
                                <Img
                                    src={(currentImage as ImgSource) || ''}
                                    fill
                                    alt="listing card gallery"
                                    className={clsx(`rounded-2xl object-cover`, imageClass)}
                                    onLoad={() => setLoaded(true)}
                                    sizes="(max-width: 1025px) 100vw, 25vw"
                                />
                            </motion.div>
                        </AnimatePresence>
                    </AppLink>
                </div>

                {/* Buttons + bottom nav bar */}
                <>
                    {loaded && navigation && (
                        <div className="opacity-0 transition-opacity group-hover/cardGallerySlider:opacity-100">
                            {index > 0 && (
                                <div className="absolute start-3 top-[calc(50%-1rem)]">
                                    <ButtonCircle
                                        color="white"
                                        onClick={() => changePhotoId(index - 1)}
                                        className={'size-8!'}
                                        aria-label="Previous photo"
                                    >
                                        <ChevronLeftIcon className="size-4! rtl:rotate-180" />
                                    </ButtonCircle>
                                </div>
                            )}
                            {index + 1 < images.length && (
                                <div className="absolute end-3 top-[calc(50%-1rem)]">
                                    <ButtonCircle
                                        color="white"
                                        onClick={() => changePhotoId(index + 1)}
                                        className={'size-8!'}
                                        aria-label="Next photo"
                                    >
                                        <ChevronRightIcon className="size-4! rtl:rotate-180" />
                                    </ButtonCircle>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Bottom Nav bar */}
                    <div className="absolute inset-x-0 bottom-0 h-10 rounded-b-2xl bg-linear-to-t from-neutral-900 opacity-50"></div>
                    <div className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 justify-center overflow-hidden rounded-full">
                        {images.map((_, i) => (
                            <button
                                className={`h-1 w-4 ${i <= index ? 'bg-white' : 'bg-white/60'}`}
                                onClick={() => changePhotoId(i)}
                                key={i}
                                aria-label={`Go to photo ${i + 1}`}
                            />
                        ))}
                    </div>
                </>
            </div>
        </MotionConfig>
    );
}
