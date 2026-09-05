import { Link } from "@/components/chrome/link";
import Img from "@/components/media/img";
import ButtonSecondary from "@/components/primitives/button-secondary";
import type { Category } from "@/types/content";

interface CardCategory7Props {
    className?: string;
    category: Category;
}

export default function CardCategory7({ className = "", category: { name, href, thumbnail } }: CardCategory7Props) {
    return (
        <div className={className}>
            <div
                className={
                    "group/CardCategory7 aspect-w-16 relative h-0 w-full overflow-hidden rounded-2xl aspect-h-10 2xl:aspect-h-9"
                }
            >
                <div>
                    <Img
                        src={thumbnail}
                        fill
                        alt={name}
                        className="object-cover brightness-100 transition-[filter] group-hover/CardCategory7:brightness-75"
                        sizes="300px"
                    />
                </div>

                <div>
                    <div className="absolute inset-5 flex flex-col items-start gap-y-2.5">
                        <div className="max-w-sm">
                            <p className="mb-2 block text-sm text-slate-700">Collection</p>
                            <h2 className="text-xl font-semibold text-slate-900 md:text-2xl">
                                <Link href={href} className="absolute inset-0"></Link>
                                {name}
                            </h2>
                        </div>
                        <ButtonSecondary className="mt-auto" href={href}>
                            Show more
                        </ButtonSecondary>
                    </div>
                </div>
            </div>
        </div>
    );
}
