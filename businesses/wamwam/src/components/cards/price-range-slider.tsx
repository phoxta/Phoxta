import clsx from "clsx";
import Slider from "rc-slider";
import { useState } from "react";
import { convertNumbThousand } from "@/lib/format";

interface PriceRangeSliderProps {
    min: number;
    max: number;
    name?: string;
    className?: string;
    onChange?: (value: number[]) => void;
    defaultValue?: number[];
    inputMaxName?: string;
    inputMinName?: string;
    showTitle?: boolean;
}

/** "$ 1.5k" from 1000 up, "$ 850" below — the catalogue's compact price label. */
function formatPrice(value: number) {
    return value >= 1000 ? `$ ${convertNumbThousand(value / 1000)}k` : `$ ${value}`;
}

export function PriceRangeSlider({
    min,
    max,
    name = "Price Range",
    className,
    onChange,
    defaultValue,
    inputMaxName = "price_max",
    inputMinName = "price_min",
    showTitle = true,
}: PriceRangeSliderProps) {
    const [rangePrices, setRangePrices] = useState<number[]>([defaultValue?.[0] ?? min, defaultValue?.[1] ?? max]);

    return (
        <div className={clsx("relative flex flex-col gap-y-6", className)}>
            <div className="flex flex-col gap-y-5">
                {showTitle && <p className="font-medium">{name}</p>}
                <div className="px-2">
                    {/* Controlled (`value`, not `defaultValue`) so the labels and hidden inputs below track the handles. */}
                    <Slider
                        range
                        min={min}
                        max={max}
                        step={1}
                        value={rangePrices}
                        allowCross={false}
                        onChange={(value) => {
                            // In range mode rc-slider always hands back a pair.
                            if (!Array.isArray(value)) return;
                            setRangePrices(value);
                            onChange?.(value);
                        }}
                    />
                </div>
            </div>

            <div className="flex justify-between gap-x-5">
                <div className="max-w-32 flex-1">
                    <div className="ps-1 text-xs/6 text-neutral-700 dark:text-neutral-300">Min price</div>
                    <div className="relative mt-0.5 w-full rounded-lg bg-neutral-100 px-4 py-2 text-sm dark:bg-neutral-800">
                        {formatPrice(rangePrices[0])}
                    </div>
                    <input type="hidden" name={inputMinName} value={rangePrices[0]} />
                </div>
                <div className="max-w-32 flex-1">
                    <div className="ps-1 text-xs/6 text-neutral-700 dark:text-neutral-300">Max price</div>
                    <div className="relative mt-0.5 w-full rounded-lg bg-neutral-100 px-4 py-2 text-sm dark:bg-neutral-800">
                        {formatPrice(rangePrices[1])}
                    </div>
                    <input type="hidden" name={inputMaxName} value={rangePrices[1]} />
                </div>
            </div>
        </div>
    );
}
