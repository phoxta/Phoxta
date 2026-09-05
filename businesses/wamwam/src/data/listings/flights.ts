import airlineLogo1 from '@/assets/images/flights/logo1.png'
import airlineLogo2 from '@/assets/images/flights/logo2.png'
import airlineLogo3 from '@/assets/images/flights/logo3.png'
import airlineLogo4 from '@/assets/images/flights/logo4.png'
import type { FlightListing } from '@/types/listings'
import { getLiveListings } from '@/data/live-store'

/** Bundled demo catalogue. Content is verbatim from the original template. */
const FLIGHTS: FlightListing[] = [
    {
      id: 'flight-listing://1',
      name: 'AKL - ICN',
      departure: 'Auckland (AKL)',
      departureTime: '2025-10-01T10:00:00Z',
      arrivalTime: '2025-10-01T21:30:00Z',
      arrival: 'Incheon (ICN)',
      duration: '11h 30m',
      stopNumber: 1,
      stopAirport: 'SGN',
      layover: '2h 30m',
      // This is a placeholder link, replace with actual flight details
      href: '#',
      price: '£4,100',
      airlines: {
        logo: airlineLogo1.src,
        name: 'Korean Air',
      },
    },
    {
      id: 'flight-listing://2',
      name: 'AKL - ICN',
      departure: 'Auckland (AKL)',
      departureTime: '2025-10-01T10:00:00Z',
      arrivalTime: '2025-10-01T21:30:00Z',
      arrival: 'Incheon (ICN)',
      duration: '15h 30m',
      stopNumber: 1,
      stopAirport: 'Ho Chi Minh City (SGN)',
      layover: '2h 30m',
      price: '£3,380',
      // This is a placeholder link, replace with actual flight details
      href: '#',
      airlines: {
        logo: airlineLogo2.src,
        name: 'Singapore Airlines',
      },
    },
    {
      id: 'flight-listing://3',
      name: 'SGN - AKl',
      departure: 'Ho Chi Minh City (SGN)',
      arrival: 'Auckland (AKL)',
      departureTime: '2025-10-01T10:00:00Z',
      arrivalTime: '2025-10-02T07:40:00Z',
      duration: '21h 40m',
      stopNumber: 1,
      stopAirport: 'Sydney (SYD)',
      layover: '2h 30m',
      price: '£2,380',
      // This is a placeholder link, replace with actual flight details
      href: '#',
      airlines: {
        logo: airlineLogo3.src,
        name: 'Philippine Airlines',
      },
    },
    {
      id: 'flight-listing://4',
      name: 'HAN - NRT',
      departure: 'Hanoi (HAN)',
      arrival: 'Tokyo (NRT)',
      departureTime: '2025-10-01T10:00:00Z',
      arrivalTime: '2025-10-01T21:30:00Z',
      duration: '5h 30m',
      stopNumber: 1,
      stopAirport: 'Sydney (SYD)',
      layover: '2h 30m',
      // This is a placeholder link, replace with actual flight details
      price: '£4,100',
      href: '#',
      airlines: {
        logo: airlineLogo4.src,
        name: 'Korean Air',
      },
    },
    {
      id: 'flight-listing://5',
      name: 'AKL - ICN',
      departure: 'Auckland (AKL)',
      arrival: 'Incheon (ICN)',
      departureTime: '2025-10-01T10:00:00Z',
      arrivalTime: '2025-10-01T21:30:00Z',
      duration: '11h 30m',
      stopNumber: 1,
      stopAirport: 'Singapore (SIN)',
      layover: '2h 30m',
      price: '£2,380',
      // This is a placeholder link, replace with actual flight details
      href: '#',
      airlines: {
        logo: airlineLogo1.src,
        name: 'Singapore Airlines',
      },
    },
    {
      id: 'flight-listing://6',
      name: 'AKL - ICN',
      departure: 'Auckland (AKL)',
      arrival: 'Incheon (ICN)',
      departureTime: '2025-10-01T10:00:00Z',
      arrivalTime: '2025-10-01T21:30:00Z',
      duration: '19h 30m',
      stopNumber: 1,
      stopAirport: 'Auckland (AKL)',
      layover: '2h 30m',
      // This is a placeholder link, replace with actual flight details
      href: '#',
      price: '£4,100',
      airlines: {
        logo: airlineLogo3.src,
        name: 'Korean Air',
      },
    },
]

/** The demo catalogue, never the live tenant's. Used as the mapping template at hydration. */
export function getDemoFlightListings(): FlightListing[] {
  return [...FLIGHTS]
}

/** Live tenant listings when hydrated, else the demo catalogue. Always a fresh array. */
export function getFlightListings(): FlightListing[] {
  return [...(getLiveListings('flight') ?? FLIGHTS)]
}
