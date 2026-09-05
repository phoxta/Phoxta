import clsx from "clsx";
import { addDays } from "date-fns";
import { useState } from "react";
import DatePicker from "react-datepicker";
import DatePickerCustomDay from "@/components/cards/date-picker-custom-day";
import DatePickerCustomHeaderTwoMonth from "@/components/cards/date-picker-custom-header-two-month";
import { getExcludeDateIntervals, toLocalDateString } from "@/lib/utils";
import type { DateRage } from "@/types/domain";

interface DatesRangeInputProps {
    className?: string;
    onChange?: (value: DateRage) => void;
    defaultStartDate?: Date | null;
    defaultEndDate?: Date | null;
}

export default function DatesRangeInput({ className, defaultEndDate, defaultStartDate, onChange }: DatesRangeInputProps) {
    const [startDate, setStartDate] = useState<Date | null>(defaultStartDate || new Date());
    const [endDate, setEndDate] = useState<Date | null>(defaultEndDate || addDays(new Date(), 3));

    const onChangeDate = (dates: DateRage) => {
        const [start, end] = dates;
        setStartDate(start);
        setEndDate(end);
        onChange?.([start, end]);
    };

    return (
        <>
            <div className={clsx(className)}>
                <h3 className="block text-center text-xl font-semibold sm:text-2xl">When&lsquo;s your trip?</h3>
                <div className="relative z-10 flex shrink-0 justify-center py-5">
                    <DatePicker
                        selected={startDate}
                        onChange={onChangeDate}
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
                </div>
            </div>

            {/* Local calendar dates: an ISO split would shift the day for anyone east of UTC in the evening. */}
            <input type="hidden" name="checkin" value={startDate ? toLocalDateString(startDate) : ""} />
            <input type="hidden" name="checkout" value={endDate ? toLocalDateString(endDate) : ""} />
        </>
    );
}
