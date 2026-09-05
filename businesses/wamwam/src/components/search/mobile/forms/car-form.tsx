import * as Headless from "@headlessui/react";
import { useState } from "react";
import { daysFromToday, formatDateRange } from "@/lib/dates";
import QueryForm from "@/lib/nav/form";
import { useRouter } from "@/lib/nav/navigation";
import type { DateRage } from "@/types/domain";
import DatesRangeInput from "../dates-range-input";
import FieldPanelContainer from "../field-panel-container";
import LocationInput from "../location-input";

type FieldName = "locationPickup" | "locationDropoff" | "dates";
type DropOffLocationType = "same" | "different";

export default function CarSearchFormMobile() {
    const [fieldNameShow, setFieldNameShow] = useState<FieldName>("locationPickup");
    const [locationInputPickUp, setLocationInputPickUp] = useState("");
    const [locationInputDropOff, setLocationInputDropOff] = useState("");
    // Summary-row dates only; the picker below seeds itself (today + 3), as it always has.
    const [startDate, setStartDate] = useState<Date | null>(daysFromToday(7));
    const [endDate, setEndDate] = useState<Date | null>(daysFromToday(24));
    const [dropOffLocationType, setDropOffLocationType] = useState<DropOffLocationType>("different");
    const router = useRouter();

    const onChangeDate = (dates: DateRage) => {
        const [start, end] = dates;
        setStartDate(start);
        setEndDate(end);
    };

    const handleFormSubmit = (formData: FormData) => {
        const location = formData.get("pickup-location");
        let url = "/car-search";
        if (typeof location === "string" && location) {
            url = url + `?location=${encodeURIComponent(location)}`;
        }
        router.push(url);
    };

    return (
        <QueryForm id="form-hero-search-form-mobile" action={handleFormSubmit} className="flex w-full flex-col gap-y-3">
            {/* RADIO */}
            <Headless.RadioGroup
                value={dropOffLocationType}
                onChange={setDropOffLocationType}
                aria-label="Drop Off Location Type"
                name="drop_off_location_type"
                className={"flex flex-wrap items-center justify-center gap-2.5 py-1"}
            >
                <Headless.Radio
                    value="different"
                    className={`flex cursor-pointer items-center rounded-full border border-neutral-300 px-4 py-1.5 text-xs font-medium dark:border-neutral-700 data-checked:bg-black data-checked:text-white data-checked:shadow-lg data-checked:shadow-black/10 dark:data-checked:bg-neutral-200 dark:data-checked:text-neutral-900`}
                >
                    Different drop off
                </Headless.Radio>
                <Headless.Radio
                    value="same"
                    className={`flex cursor-pointer items-center rounded-full border border-neutral-300 px-4 py-1.5 text-xs font-medium dark:border-neutral-700 data-checked:bg-black data-checked:text-white data-checked:shadow-lg data-checked:shadow-black/10 dark:data-checked:bg-neutral-200 dark:data-checked:text-neutral-900`}
                >
                    Same drop off
                </Headless.Radio>
            </Headless.RadioGroup>

            <FieldPanelContainer
                isActive={fieldNameShow === "locationPickup"}
                headingOnClick={() => setFieldNameShow("locationPickup")}
                headingTitle="Pick up"
                headingValue={locationInputPickUp || "Location"}
            >
                <LocationInput
                    headingText="Pick up?"
                    inputName="pickup-location"
                    defaultValue={locationInputPickUp}
                    onChange={setLocationInputPickUp}
                    onSelect={() => {
                        if (dropOffLocationType === "different") {
                            setFieldNameShow("locationDropoff");
                        } else {
                            setFieldNameShow("dates");
                        }
                    }}
                />
            </FieldPanelContainer>

            {dropOffLocationType === "different" && (
                <FieldPanelContainer
                    isActive={fieldNameShow === "locationDropoff"}
                    headingOnClick={() => setFieldNameShow("locationDropoff")}
                    headingTitle="Drop off"
                    headingValue={locationInputDropOff || "Location"}
                >
                    <LocationInput
                        headingText="Drop off?"
                        inputName="dropoff-location"
                        defaultValue={locationInputDropOff}
                        onChange={setLocationInputDropOff}
                        onSelect={() => setFieldNameShow("dates")}
                    />
                </FieldPanelContainer>
            )}

            {/* DATE RANGE  */}
            <FieldPanelContainer
                isActive={fieldNameShow === "dates"}
                headingOnClick={() => setFieldNameShow("dates")}
                headingTitle="When"
                headingValue={startDate ? formatDateRange([startDate, endDate]) : "Add dates"}
            >
                <DatesRangeInput onChange={onChangeDate} />
            </FieldPanelContainer>
        </QueryForm>
    );
}
