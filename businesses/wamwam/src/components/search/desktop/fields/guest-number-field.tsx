import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { UserPlusIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useState } from "react";
import NcInputNumber from "@/components/primitives/nc-input-number";
import type { GuestsObject } from "@/types/domain";
import { ClearDataButton } from "./clear-data-button";
import { fieldStyles, type FieldStyle } from "./field-styles";

const PANEL =
    "absolute end-0 top-full z-50 mt-3 flex w-sm flex-col gap-y-6 rounded-3xl bg-white px-8 py-7 shadow-xl transition duration-150 data-closed:translate-y-1 data-closed:opacity-0 dark:bg-neutral-800";

interface GuestNumberFieldProps {
    fieldStyle?: FieldStyle;
    className?: string;
    clearDataButtonClassName?: string;
}

export function GuestNumberField({
    fieldStyle = "default",
    className = "flex-1",
    clearDataButtonClassName,
}: GuestNumberFieldProps) {
    const [guestAdultsInputValue, setGuestAdultsInputValue] = useState(2);
    const [guestChildrenInputValue, setGuestChildrenInputValue] = useState(1);
    const [guestInfantsInputValue, setGuestInfantsInputValue] = useState(1);

    const handleChangeData = (value: number, type: keyof GuestsObject) => {
        if (type === "guestAdults") setGuestAdultsInputValue(value);
        if (type === "guestChildren") setGuestChildrenInputValue(value);
        if (type === "guestInfants") setGuestInfantsInputValue(value);
    };

    const totalGuests = guestChildrenInputValue + guestAdultsInputValue + guestInfantsInputValue;
    return (
        <Popover className={`group relative z-10 flex ${className}`}>
            {({ open: showPopover }) => (
                <>
                    <PopoverButton
                        aria-label="Select guests"
                        className={clsx(
                            fieldStyles.button.base,
                            fieldStyles.button[fieldStyle],
                            showPopover && fieldStyles.button.focused,
                        )}
                    >
                        {fieldStyle === "default" && (
                            <UserPlusIcon className="size-5 text-neutral-300 lg:size-7 dark:text-neutral-400" />
                        )}

                        <div className="grow">
                            <span className={clsx("block font-[550]", fieldStyles.mainText[fieldStyle])}>{totalGuests || ""} Guests</span>
                            <span className="mt-1 block text-sm leading-none font-[350] text-neutral-400">
                                {totalGuests ? "Guests" : "Add guests"}
                            </span>
                        </div>
                    </PopoverButton>

                    {/* Clearing zeroes every counter, adults included — below the picker's own min of 1, on purpose. */}
                    <ClearDataButton
                        className={clsx(!totalGuests && "sr-only", clearDataButtonClassName)}
                        onClick={() => {
                            setGuestAdultsInputValue(0);
                            setGuestChildrenInputValue(0);
                            setGuestInfantsInputValue(0);
                        }}
                    />

                    <PopoverPanel unmount={false} transition className={PANEL}>
                        <NcInputNumber
                            className="w-full"
                            defaultValue={guestAdultsInputValue}
                            onChange={(value) => handleChangeData(value, "guestAdults")}
                            max={10}
                            min={1}
                            label={"Adults"}
                            description={"Ages 13 or above"}
                            inputName="guestAdults"
                        />
                        <NcInputNumber
                            className="w-full"
                            defaultValue={guestChildrenInputValue}
                            onChange={(value) => handleChangeData(value, "guestChildren")}
                            max={4}
                            label={"Children"}
                            description={"Ages 2–12"}
                            inputName="guestChildren"
                        />
                        <NcInputNumber
                            className="w-full"
                            defaultValue={guestInfantsInputValue}
                            onChange={(value) => handleChangeData(value, "guestInfants")}
                            max={4}
                            label={"Infants"}
                            description={"Ages 0–2"}
                            inputName="guestInfants"
                        />
                    </PopoverPanel>
                </>
            )}
        </Popover>
    );
}
