import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { CurrencyDollarIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useState } from "react";
import { PriceRangeSlider } from "@/components/cards/price-range-slider";
import { convertNumbThousand } from "@/lib/format";
import { ClearDataButton } from "./clear-data-button";
import { fieldStyles, type FieldStyle } from "./field-styles";

const PANEL =
    "absolute top-full z-10 mt-3 w-96 transition duration-150 data-closed:translate-y-1 data-closed:opacity-0 end-0 overflow-hidden rounded-3xl bg-white p-7 shadow-lg ring-1 ring-black/5 dark:bg-neutral-800";

interface PriceRangeInputFieldProps {
    className?: string;
    fieldStyle?: FieldStyle;
    panelClassName?: string;
    clearDataButtonClassName?: string;
    min?: number;
    max?: number;
}

export function PriceRangeInputField({
    className = "flex-1",
    fieldStyle = "default",
    panelClassName,
    clearDataButtonClassName,
    min = 0,
    max = 1000000,
}: PriceRangeInputFieldProps) {
    const [rangePrices, setRangePrices] = useState<number[]>([90000, 800000]);

    return (
        <>
            <Popover className={`group relative z-10 flex ${className}`}>
                {({ open: showPopover }) => (
                    <>
                        <PopoverButton
                            aria-label="Select price range"
                            className={clsx(
                                fieldStyles.button.base,
                                fieldStyles.button[fieldStyle],
                                showPopover && fieldStyles.button.focused,
                            )}
                        >
                            {fieldStyle === "default" && (
                                <CurrencyDollarIcon className="size-5 text-neutral-300 lg:size-7 dark:text-neutral-400" />
                            )}

                            <div className="flex-1 text-start">
                                <span className={clsx("block font-[550]", fieldStyles.mainText[fieldStyle])}>
                                    {`$${convertNumbThousand(rangePrices[0] / 1000)}k ~ $${convertNumbThousand(rangePrices[1] / 1000)}k`}
                                </span>
                                <span className="mt-1 block text-sm leading-none font-[350] text-neutral-400">Choose price range</span>
                            </div>
                        </PopoverButton>

                        <ClearDataButton
                            className={clsx(rangePrices[0] === min && rangePrices[1] === max && "sr-only", clearDataButtonClassName)}
                            onClick={() => setRangePrices([min, max])}
                        />

                        <PopoverPanel transition className={clsx(panelClassName, PANEL)}>
                            <PriceRangeSlider
                                name={"Price range"}
                                min={min}
                                max={max}
                                defaultValue={rangePrices}
                                onChange={(value) => {
                                    setRangePrices(value);
                                }}
                            />
                        </PopoverPanel>
                    </>
                )}
            </Popover>

            <input type="hidden" name="price_min" value={rangePrices[0]} />
            <input type="hidden" name="price_max" value={rangePrices[1]} />
        </>
    );
}
