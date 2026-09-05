import { useState } from "react";
import DatePicker from "react-datepicker";
import DatePickerCustomDay from "@/components/cards/date-picker-custom-day";
import DatePickerCustomHeaderTwoMonth from "@/components/cards/date-picker-custom-header-two-month";
import { Divider } from "@/components/primitives/divider";
import { Heading } from "@/components/primitives/heading";
import NcInputNumber from "@/components/primitives/nc-input-number";
import QueryForm from "@/lib/nav/form";
import { useRouter } from "@/lib/nav/navigation";

const DAY_MS = 60 * 60 * 24 * 1000;

/** Blocked-out days, held as epoch ms so membership is a cheap `includes`. */
function seedExcludedDates(): number[] {
    const today = new Date().getTime();
    return [today, today + DAY_MS, today + 3 * DAY_MS, today + 4 * DAY_MS];
}

export default function AddListingStep9() {
    const [dates, setDates] = useState<number[]>(seedExcludedDates);
    const router = useRouter();

    const handleSubmitForm = () => {
        router.push("/add-listing/10");
    };

    const handleToggleDate = (date: Date | null) => {
        if (!date) {
            return;
        }
        const newTime = date.getTime();
        setDates((current) =>
            current.includes(newTime) ? current.filter((item) => item !== newTime) : [...current, newTime],
        );
    };

    return (
        <>
            <div>
                <Heading>How long can guests stay?</Heading>
                <span className="mt-2 block text-muted-foreground">
                    Shorter trips can mean more reservations, but you&apos;ll turn over your space more often.
                </span>
            </div>
            <Divider />

            <QueryForm id="add-listing-form" action={handleSubmitForm} className="flex flex-col gap-y-5">
                <NcInputNumber inputName="Nights-min" label="Nights min" defaultValue={1} />
                <NcInputNumber inputName="Nights-max" label="Nights max" defaultValue={90} />

                {dates
                    .map((item) => new Date(item))
                    .map((date, index) => (
                        <input type="hidden" name="excludeDates[]" key={index} value={date.toISOString()} />
                    ))}
            </QueryForm>

            <div className="mt-5">
                <Heading fontSize="text-2xl">Availability</Heading>
                <span className="mt-2 block text-muted-foreground">Select the dates your place is available.</span>
            </div>

            <div className="addListingDatePickerExclude">
                <DatePicker
                    onChange={handleToggleDate}
                    monthsShown={2}
                    showPopperArrow={false}
                    excludeDates={dates.filter(Boolean).map((item) => new Date(item))}
                    inline
                    renderCustomHeader={(p) => <DatePickerCustomHeaderTwoMonth {...p} />}
                    renderDayContents={(day, date) => <DatePickerCustomDay dayOfMonth={day} date={date} />}
                />
            </div>

            <Divider />
        </>
    );
}
