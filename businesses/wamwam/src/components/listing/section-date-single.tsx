import { useState } from "react";
import DatePicker from "react-datepicker";
import DatePickerCustomDay from "@/components/cards/date-picker-custom-day";
import DatePickerCustomHeaderTwoMonth from "@/components/cards/date-picker-custom-header-two-month";
import { SectionHeading } from "@/components/listing/section-heading";
import { Divider } from "@/components/primitives/divider";
import { getExcludeDateIntervals } from "@/lib/utils";

export default function SectionDateSingle() {
    const [startDate, setStartDate] = useState<Date | null>(new Date());

    return (
        <div className="listingSection__wrap">
            <SectionHeading>Select your dates</SectionHeading>
            <Divider className="w-14!" />

            <DatePicker
                selected={startDate}
                onChange={setStartDate}
                startDate={startDate}
                monthsShown={2}
                showPopperArrow={false}
                inline
                excludeDateIntervals={getExcludeDateIntervals()}
                renderCustomHeader={(props) => <DatePickerCustomHeaderTwoMonth {...props} />}
                renderDayContents={(day, date) => <DatePickerCustomDay dayOfMonth={day} date={date} />}
            />

            {/* inputs */}
            <input type="hidden" name="startDate" value={startDate ? startDate.toISOString() : ""} />
        </div>
    );
}
