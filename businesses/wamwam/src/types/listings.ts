import type { LatLng } from "@/types/domain";

/** One amenity chip: a key into ICONS_MAP plus its label. */
export interface Amenity {
    icon: string;
    text: string;
}

export interface Host {
    displayName: string;
    avatarUrl: string;
    handle: string;
    description: string;
    listingsCount: number;
    reviewsCount: number;
    rating: number;
    responseRate: number;
    responseTime: string;
    isSuperhost: boolean;
    isVerified: boolean;
    joinedDate: string;
    timeAsHost?: { years: number; months: number };
}

/** Fields every bookable listing card renders, across stays, cars and experiences. */
export interface ListingBase {
    id: string;
    title: string;
    handle: string;
    badge: string;
    featuredImage: string;
    like?: boolean;
    address: string;
    reviewStart: number;
    reviewCount: number;
    /** Display string with currency symbol, e.g. "£260". */
    price: string;
    amenities: Amenity[];
    /** Present on stays and on every live-mapped listing. */
    galleryImgs?: string[];
    map?: LatLng;
}

export interface StayListing extends ListingBase {
    galleryImgs: string[];
    map: LatLng;
    nameLocalized: string;
}

export interface CarListing extends ListingBase {
    /** Present on one demo record; not rendered by any card. */
    airbags?: number;
}

export type ExperienceListing = ListingBase;

export interface FlightListing {
    id: string;
    name: string;
    departure: string;
    departureTime: string;
    arrivalTime: string;
    arrival: string;
    duration: string;
    stopNumber: number;
    stopAirport: string;
    layover: string;
    href: string;
    price: string;
    airlines: { logo: string; name: string };
}

/** Detail-page enrichment layered over a StayListing by getStayListingByHandle. */
export interface StayListingDetail extends StayListing {
    description: string;
    listingCategory: string;
    bathrooms: number;
    bedrooms: number;
    date: string;
    guests: number;
    maxGuests: number;
    beds: number;
    host: Host;
    fullAmenities: Amenity[];
}

export interface CarListingDetail extends CarListing {
    description: string;
    listingCategory: string;
    bags: number;
    pickUpAddress: string;
    pickUpTime: string;
    dropOffAddress: string;
    dropOffTime: string;
    map: LatLng;
    galleryImgs: string[];
    host: Host;
}

export interface ExperienceListingDetail extends ExperienceListing {
    description: string;
    listingCategory: string;
    galleryImgs: string[];
    host: Host;
    map: LatLng;
}

/** Any listing that renders through the shared card/detail components. */
export type AnyListing = StayListing | CarListing | ExperienceListing;

export type ListingsByVertical = {
    stay: StayListing[];
    car: CarListing[];
    experience: ExperienceListing[];
    flight: FlightListing[];
};
