import * as Headless from "@headlessui/react";
import { useState } from "react";
import { daysFromToday, formatDateRange } from "@/lib/dates";
import QueryForm from "@/lib/nav/form";
import { useRouter } from "@/lib/nav/navigation";
import type { DateRage, GuestsObject } from "@/types/domain";
import DatesRangeInput from "../dates-range-input";
import FieldPanelContainer from "../field-panel-container";
import GuestsInput from "../guests-input";
import LocationInput from "../location-input";

type FieldName = "locationPickup" | "locationDropoff" | "dates" | "guests" | "general";

const dropOffLocationTypes = ["Round-trip", "One-way"] as const;
const flightClasses = ["Economy", "Business", "Multiple"] as const;
type TripType = (typeof dropOffLocationTypes)[number];
type FlightClass = (typeof flightClasses)[number];

/** The radio pill for trip type and ticket class (checked state via data-checked). */
const RADIO_PILL =
    "flex cursor-pointer items-center rounded-full border border-neutral-300 px-4 py-1.5 text-xs font-medium dark:border-neutral-700 data-checked:bg-black data-checked:text-white data-checked:shadow-lg data-checked:shadow-black/10 dark:data-checked:bg-neutral-200 dark:data-checked:text-neutral-900";

export default function FlightSearchFormMobile() {
    const [fieldNameShow, setFieldNameShow] = useState<FieldName>("locationPickup");
    const [locationInputPickUp, setLocationInputPickUp] = useState("");
    const [locationInputDropOff, setLocationInputDropOff] = useState("");
    // Summary-row dates only; the picker below seeds itself (today + 3), as it always has.
    const [startDate, setStartDate] = useState<Date | null>(daysFromToday(7));
    const [endDate, setEndDate] = useState<Date | null>(daysFromToday(24));

    const [dropOffLocationType, setDropOffLocationType] = useState<TripType>(dropOffLocationTypes[0]);
    const [flightClassState, setFlightClassState] = useState<FlightClass>(flightClasses[0]);

    const [guestInput, setGuestInput] = useState<GuestsObject>({
        guestAdults: 0,
        guestChildren: 0,
        guestInfants: 0,
    });
    const router = useRouter();

    const handleFormSubmit = (formData: FormData) => {
        const location = formData.get("locationPickup");
        let url = "/flight-search";
        if (typeof location === "string" && location) {
            url = url + `?location=${encodeURIComponent(location)}`;
        }
        router.push(url);
    };

    const onChangeDate = (dates: DateRage) => {
        const [start, end] = dates;
        setStartDate(start);
        setEndDate(end);
    };

    const renderInputLocationPickup = () => {
        return (
            <FieldPanelContainer
                isActive={fieldNameShow === "locationPickup"}
                headingOnClick={() => setFieldNameShow("locationPickup")}
                headingTitle="Pick up"
                headingValue={locationInputPickUp || "Location"}
            >
                <LocationInput
                    headingText="Pick up?"
                    inputName="locationPickup"
                    defaultValue={locationInputPickUp}
                    onChange={setLocationInputPickUp}
                    onSelect={() => setFieldNameShow("dates")}
                />
            </FieldPanelContainer>
        );
    };

    const renderInputLocationDropOff = () => {
        return (
            <FieldPanelContainer
                isActive={fieldNameShow === "locationDropoff"}
                headingOnClick={() => setFieldNameShow("locationDropoff")}
                headingTitle="Drop off"
                headingValue={locationInputDropOff || "Location"}
            >
                <LocationInput
                    headingText="Drop off?"
                    inputName="locationDropOff"
                    defaultValue={locationInputDropOff}
                    onChange={setLocationInputDropOff}
                    onSelect={() => setFieldNameShow("dates")}
                />
            </FieldPanelContainer>
        );
    };

    const renderInputDates = () => {
        return (
            <FieldPanelContainer
                isActive={fieldNameShow === "dates"}
                headingOnClick={() => setFieldNameShow("dates")}
                headingTitle="When"
                headingValue={startDate ? formatDateRange([startDate, endDate]) : "Add dates"}
            >
                <DatesRangeInput onChange={onChangeDate} />
            </FieldPanelContainer>
        );
    };

    const renderGenerals = () => {
        return (
            <FieldPanelContainer
                isActive={fieldNameShow === "general"}
                headingOnClick={() => setFieldNameShow("general")}
                headingTitle="Flight type?"
                headingValue={`${dropOffLocationType}, ${flightClassState}`}
            >
                <p className="block text-xl font-semibold sm:text-2xl">Flight type?</p>
                <div className="relative mt-5">
                    <Headless.RadioGroup
                        value={dropOffLocationType}
                        onChange={setDropOffLocationType}
                        aria-label="Trip type"
                        name="dropOffLocationType"
                        className="flex flex-wrap items-center gap-2.5"
                    >
                        {dropOffLocationTypes.map((tab) => (
                            <Headless.Field key={tab}>
                                <Headless.Radio value={tab} className={RADIO_PILL}>
                                    {tab}
                                </Headless.Radio>
                            </Headless.Field>
                        ))}
                    </Headless.RadioGroup>

                    <div className="mt-6">
                        <p className="text-base font-semibold">Ticket Class</p>
                        <Headless.RadioGroup
                            value={flightClassState}
                            onChange={setFlightClassState}
                            aria-label="Ticket class"
                            name="flightClasses"
                            className="mt-4 flex flex-wrap items-center gap-2.5"
                        >
                            {flightClasses.map((tab) => (
                                <Headless.Field key={tab}>
                                    <Headless.Radio value={tab} className={RADIO_PILL}>
                                        {tab}
                                    </Headless.Radio>
                                </Headless.Field>
                            ))}
                        </Headless.RadioGroup>
                    </div>
                </div>
            </FieldPanelContainer>
        );
    };

    const renderInputGuests = () => {
        const isActive = fieldNameShow === "guests";
        const totalGuests = (guestInput.guestAdults || 0) + (guestInput.guestChildren || 0) + (guestInput.guestInfants || 0);
        const guestStringConverted = totalGuests ? `${totalGuests} Guests` : "Add guests";

        return (
            <FieldPanelContainer
                isActive={isActive}
                headingOnClick={() => setFieldNameShow("guests")}
                headingTitle="Who"
                headingValue={guestStringConverted}
            >
                <GuestsInput defaultValue={guestInput} onChange={setGuestInput} />
            </FieldPanelContainer>
        );
    };

    return (
        <QueryForm id="form-hero-search-form-mobile" action={handleFormSubmit} className="flex w-full flex-col gap-y-3">
            {renderInputLocationPickup()}
            {renderInputLocationDropOff()}
            {renderGenerals()}
            {renderInputDates()}
            {renderInputGuests()}
        </QueryForm>
    );
}
