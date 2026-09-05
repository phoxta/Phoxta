import clsx from "clsx";
import type { EmblaViewportRefType } from "embla-carousel-react";
import CardCategory1 from "@/components/cards/card-category1";
import CardCategory3 from "@/components/cards/card-category3";
import CardCategory4 from "@/components/cards/card-category4";
import CardCategory5 from "@/components/cards/card-category5";
import CardCategory6 from "@/components/cards/card-category6";
import CardCategory7 from "@/components/cards/card-category7";
import CardCategory8 from "@/components/cards/card-category8";
import type { Category } from "@/types/content";

type CardStyle = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";

interface CarouselCategoriesProps {
    categories: Category[];
    className?: string;
    emblaRef: EmblaViewportRefType;
    cardStyle?: CardStyle;
}

/** Style "2" has always rendered CardCategory3 — there is no second card variant. */
function renderCard(category: Category, cardStyle: CardStyle) {
    switch (cardStyle) {
        case "1":
            return <CardCategory1 category={category} />;
        case "2":
        case "3":
            return <CardCategory3 category={category} />;
        case "4":
            return <CardCategory4 category={category} />;
        case "5":
            return <CardCategory5 category={category} />;
        case "6":
            return <CardCategory6 category={category} />;
        case "7":
            return <CardCategory7 category={category} />;
        case "8":
        default:
            return <CardCategory8 category={category} />;
    }
}

export default function CarouselCategories({ className, categories, emblaRef, cardStyle = "8" }: CarouselCategoriesProps) {
    return (
        <div className={clsx("embla", className)} ref={emblaRef}>
            <div className="-ms-6 embla__container">
                {categories.map((category) => (
                    <div key={category.id} className="embla__slide basis-[86%] ps-6 md:basis-[45%] lg:basis-1/3 xl:basis-1/4">
                        {renderCard(category, cardStyle)}
                    </div>
                ))}
            </div>
        </div>
    );
}
