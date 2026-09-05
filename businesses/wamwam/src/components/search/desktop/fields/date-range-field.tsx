import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { CalendarIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { addDays } from "date-fns";
import { useState } from "react";
import DatePicker from "react-datepicker";
import DatePickerCustomDay from "@/components/cards/date-picker-custom-day";
import DatePickerCustomHeaderTwoMonth from "@/components/cards/date-picker-custom-header-two-month";
import { getExcludeDateIntervals, toLocalDateString } from "@/lib/utils";
import { ClearDataButton } from "./clear-data-button";
import { fieldStyles, type FieldStyle } from "./field-styles";

const PANEL =
    "absolute top-full z-10 mt-3 w-3xl transition duration-150 data-closed:translate-y-1 data-closed:opacity-0 left-1/2 -translate-x-1/2 overflow-hidden rounded-3xl bg-white p-8 shadow-lg ring-1 ring-black/5 dark:bg-neutral-800";

const SHORT_DATE: Intl.DateTimeFormatOptions = { month: "short", day: "2-digit" };

interface DateRangeFieldProps {
    className?: string;
    fieldStyle?: FieldStyle;
    clearDataButtonClassName?: string;
    description?: string;
    panelClassName?: string;
    isOnlySingleDate?: boolean;
}

export function DateRangeField({
    className = "flex-1",
    fieldStyle = "default",
    clearDataButtonClassName,
    description = "Check-in / Check-out",
    panelClassName,
    isOnlySingleDate = false,
}: DateRangeFieldProps) {
    const [startDate, setStartDate] = useState<Date | null>(new Date());
    const [endDate, setEndDate] = useState<Date | null>(addDays(new Date(), 3));

    return (
        <>
            <Popover className={`group relative z-10 flex ${className}`}>
                {({ open: showPopover }) => (
                    <>
                        <PopoverButton
                            aria-label="Select dates"
                            className={clsx(
                                fieldStyles.button.base,
                                fieldStyles.button[fieldStyle],
                                showPopover && fieldStyles.button.focused,
                            )}
                        >
                            {fieldStyle === "default" && (
                                <CalendarIcon className="size-5 text-neutral-300 lg:size-7 dark:text-neutral-400" />
                            )}

                            <div className="flex-1 text-start">
                                <span className={clsx("block font-[550]", fieldStyles.mainText[fieldStyle])}>
                                    {startDate?.toLocaleDateString("en-US", SHORT_DATE) || "Add dates"}
                                    {endDate && !isOnlySingleDate ? " - " + endDate.toLocaleDateString("en-US", SHORT_DATE) : ""}
                                </span>
                                <span className="mt-1 block text-sm leading-none font-[350] text-neutral-400">
                                    {description}
                                </span>
                            </div>
                        </PopoverButton>

                        <ClearDataButton
                            className={clsx(!startDate && !endDate && "sr-only", clearDataButtonClassName)}
                            onClick={() => {
                                setStartDate(null);
                                setEndDate(null);
                            }}
                        />

                        <PopoverPanel unmount={false} transition className={clsx(panelClassName, PANEL)}>
                            {isOnlySingleDate ? (
                                <DatePicker
                                    selected={startDate}
                                    onChange={(date: Date | null) => {
                                        setStartDate(date);
                                        // A one-way pick still carries an end date two days out, so the
                                        // hidden checkout stays populated for the same result page.
                                        setEndDate(new Date((date?.getTime() || 0) + 2 * 24 * 60 * 60 * 1000));
                                    }}
                                    startDate={startDate}
                                    monthsShown={2}
                                    showPopperArrow={false}
                                    inline
                                    excludeDateIntervals={getExcludeDateIntervals()}
                                    renderCustomHeader={(p) => <DatePickerCustomHeaderTwoMonth {...p} />}
                                    renderDayContents={(day, date) => <DatePickerCustomDay dayOfMonth={day} date={date} />}
                                />
                            ) : (
                                <DatePicker
                                    selected={startDate}
                                    onChange={(dates) => {
                                        const [start, end] = dates;
                                        setStartDate(start);
                                        setEndDate(end);
                                    }}
                                    startDate={startDate}
                                    endDate={endDate}
                                    selectsRange
                                    monthsShown={2}
                                    showPopperArrow={false}
                                    inline
                                    excludeDateIntervals={getExcludeDateIntervals()}
                                    renderCustomHeader={(p) => <DatePickerCustomHeaderTwoMonth {...p} />}
                                    renderDayContents={(day, date) => <DatePickerCustomDay dayOfMonth={day} date={date} />}
                                />
                            )}
                        </PopoverPanel>
                    </>
                )}
            </Popover>

            {/* Local calendar dates: an ISO split would shift the day for anyone east of UTC in the evening. */}
            <input type="hidden" name="checkin" value={startDate ? toLocalDateString(startDate) : ""} />
            {!isOnlySingleDate && (
                <input type="hidden" name="checkout" value={endDate ? toLocalDateString(endDate) : ""} />
            )}
        </>
    );
}
