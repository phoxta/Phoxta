/** Shared domain types used across search forms, pickers and listing pages. */

export interface GuestsObject {
    guestAdults?: number;
    guestChildren?: number;
    guestInfants?: number;
}

export type ListingType = "Stays" | "Experiences" | "Cars" | "Flights";

export type Vertical = "stay" | "car" | "experience" | "flight";

export interface PropertyType {
    name: string;
    description: string;
    value: string;
}

export type ClassOfProperties = PropertyType;

/**
 * A [start, end] date pair as held by the range pickers. The historical
 * spelling is kept because it is part of the public prop surface of 17
 * components.
 */
export type DateRage = [Date | null, Date | null];

export type TExcludeDate = Array<{ date: Date; message?: string }> | Array<Date>;

export type TExcludeDateIntervals = Array<{ start: Date; end: Date }>;

export type CustomLink = {
    href: string;
    label: string;
    target?: string;
};

export type LatLng = { lat: number; lng: number };
