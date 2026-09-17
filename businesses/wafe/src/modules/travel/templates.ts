import type { PackingTemplate, TripKind } from "./types";

/**
 * The run-up, as a family actually runs it.
 *
 * A pre-trip checklist is only useful if it arrives at the right moment, so
 * every item is stored as an OFFSET from departure — T-14, T-7, T-3, T-1, T-0 —
 * and the real due date is computed from the trip's start. Move the flight and
 * the whole run-up moves with it.
 *
 * The template is chosen by the KIND of trip and whether we are leaving the
 * country: a day out in Kent needs wellies and nothing else, and a fortnight in
 * Lagos needs passports checked, naira ordered and somebody watching the house.
 */

export interface ChecklistSeedItem {
    item: string;
    note: string;
    dueOffsetDays: number;
}

const INTERNATIONAL: ChecklistSeedItem[] = [
    { item: "Check every passport is valid six months past our return", note: "The rule that catches families out. Renewals take four to six weeks.", dueOffsetDays: 14 },
    { item: "Confirm visas, entry forms and the address we're staying at", note: "Landing cards ask for an address and a phone number.", dueOffsetDays: 14 },
    { item: "Travel insurance for everyone travelling", note: "One policy that covers the whole party, with the medical cover checked.", dueOffsetDays: 14 },
    { item: "Ask the GP about vaccinations and anything we need to take", note: "Some courses have to start two weeks out.", dueOffsetDays: 14 },
    { item: "Order currency and tell the bank we're travelling", note: "So the cards don't stop working on day one.", dueOffsetDays: 7 },
    { item: "Ask a neighbour to keep an eye on the house", note: "A key, the bins, and a light on in the evening.", dueOffsetDays: 7 },
    { item: "Pause the deliveries and the milk", note: "Nothing says 'empty house' like a doorstep of parcels.", dueOffsetDays: 3 },
    { item: "Check in online and pick seats together", note: "Twenty-four hours before, and the children sit with a parent.", dueOffsetDays: 1 },
    { item: "Charge everything and pack the chargers last", note: "Phones, tablets, the power bank, the camera.", dueOffsetDays: 0 },
];

const DOMESTIC: ChecklistSeedItem[] = [
    { item: "Book the cottage balance and print the directions", note: "Signal is a rumour up there.", dueOffsetDays: 14 },
    { item: "Service the car and check the tyres", note: "Long drive, full boot.", dueOffsetDays: 7 },
    { item: "Ask a neighbour to keep an eye on the house", note: "A key and the bins.", dueOffsetDays: 7 },
    { item: "Pause the deliveries", note: "And the milk.", dueOffsetDays: 3 },
    { item: "Food shop for the first night", note: "Arriving hungry to an empty fridge is a rite of passage we can skip.", dueOffsetDays: 1 },
    { item: "Charge everything and pack the boot", note: "Wellies by the door.", dueOffsetDays: 0 },
];

const SCHOOL_TRIP: ChecklistSeedItem[] = [
    { item: "Return the consent form and pay the balance", note: "The school's deadline, not ours.", dueOffsetDays: 14 },
    { item: "Name every single thing on the kit list", note: "Everything comes home or nothing does.", dueOffsetDays: 7 },
    { item: "Buy whatever is missing from the kit list", note: "Check the list twice before ordering.", dueOffsetDays: 7 },
    { item: "Pack together, so they know what is in the bag", note: "They are the one unpacking it.", dueOffsetDays: 1 },
    { item: "Set the alarm for the coach", note: "Early. Earlier than that.", dueOffsetDays: 0 },
];

const DAY_OUT: ChecklistSeedItem[] = [
    { item: "Book the tickets", note: "Cheaper online, and no queue.", dueOffsetDays: 3 },
    { item: "Check the weather and pack accordingly", note: "Wellies or sun cream, rarely neither.", dueOffsetDays: 1 },
    { item: "Snacks, water and a change of clothes", note: "For the little one especially.", dueOffsetDays: 0 },
];

/** The run-up for a trip of this kind, going to this country. */
export function checklistTemplate(kind: TripKind, countryCode: string): ChecklistSeedItem[] {
    if (kind === "day-out") return DAY_OUT;
    if (kind === "school-trip") return SCHOOL_TRIP;
    return countryCode && countryCode !== "GB" ? INTERNATIONAL : DOMESTIC;
}

/** A sensible packing template for a trip, when nobody has chosen one. */
export function templateFor(kind: TripKind, countryCode: string): PackingTemplate {
    if (kind === "day-out") return "day-out";
    if (kind === "school-trip") return "school-trip";
    if (countryCode === "NG" || countryCode === "GH" || countryCode === "ES" || countryCode === "PT") return "warm";
    if (countryCode === "GB") return "cold";
    return "city";
}
