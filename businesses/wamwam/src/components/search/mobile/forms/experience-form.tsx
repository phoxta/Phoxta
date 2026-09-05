import { useState } from "react";
import { daysFromToday, formatDateRange } from "@/lib/dates";
import QueryForm from "@/lib/nav/form";
import { useRouter } from "@/lib/nav/navigation";
import type { DateRage, GuestsObject } from "@/types/domain";
import DatesRangeInput from "../dates-range-input";
import FieldPanelContainer from "../field-panel-container";
import GuestsInput from "../guests-input";
import LocationInput from "../location-input";

type FieldName = "location" | "dates" | "guests";

interface DestinationSearchFormMobileProps {
    /** Results page the submit navigates to; `?location=` is appended when one was typed. */
    searchPath: string;
}

/**
 * Where / When / Who steps. The experiences and stays mobile forms were
 * identical apart from the results URL, so both are this component.
 */
export function DestinationSearchFormMobile({ searchPath }: DestinationSearchFormMobileProps) {
    const [fieldNameShow, setFieldNameShow] = useState<FieldName>("location");
    const [locationInputTo, setLocationInputTo] = useState("");
    const [guestInput, setGuestInput] = useState<GuestsObject>({
        guestAdults: 0,
        guestChildren: 0,
        guestInfants: 0,
    });
    const [startDate, setStartDate] = useState<Date | null>(daysFromToday(7));
    const [endDate, setEndDate] = useState<Date | null>(daysFromToday(11));
    const router = useRouter();

    const onChangeDate = (dates: DateRage) => {
        const [start, end] = dates;
        setStartDate(start);
        setEndDate(end);
    };
    const handleFormSubmit = (formData: FormData) => {
        const location = formData.get("location");
        let url = searchPath;
        if (typeof location === "string" && location) {
            url = url + `?location=${encodeURIComponent(location)}`;
        }
        router.push(url);
    };

    const totalGuests = (guestInput.guestAdults || 0) + (guestInput.guestChildren || 0) + (guestInput.guestInfants || 0);
    const guestStringConverted = totalGuests ? `${totalGuests} Guests` : "Add guests";
    return (
        <QueryForm id="form-hero-search-form-mobile" action={handleFormSubmit} className="flex w-full flex-col gap-y-3">
            {/*  LOCATION */}
            <FieldPanelContainer
                isActive={fieldNameShow === "location"}
                headingOnClick={() => setFieldNameShow("location")}
                headingTitle="Where"
                headingValue={locationInputTo || "Location"}
            >
                <LocationInput
                    defaultValue={locationInputTo}
                    onChange={setLocationInputTo}
                    onSelect={() => setFieldNameShow("dates")}
                />
            </FieldPanelContainer>

            {/* DATE RANGE  */}
            <FieldPanelContainer
                isActive={fieldNameShow === "dates"}
                headingOnClick={() => setFieldNameShow("dates")}
                headingTitle="When"
                headingValue={startDate ? formatDateRange([startDate, endDate]) : "Add dates"}
            >
                <DatesRangeInput defaultStartDate={startDate} defaultEndDate={endDate} onChange={onChangeDate} />
            </FieldPanelContainer>

            {/* GUEST NUMBER */}
            <FieldPanelContainer
                isActive={fieldNameShow === "guests"}
                headingOnClick={() => setFieldNameShow("guests")}
                headingTitle="Who"
                headingValue={guestStringConverted}
            >
                <GuestsInput defaultValue={guestInput} onChange={setGuestInput} />
            </FieldPanelContainer>
        </QueryForm>
    );
}

export default function ExperienceSearchFormMobile() {
    return <DestinationSearchFormMobile searchPath="/experience-search" />;
}
