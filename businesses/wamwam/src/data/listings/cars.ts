import avatars1 from '@/assets/images/avatars/Image-1.png'
import type { CarListing, CarListingDetail } from '@/types/listings'
import { getLiveListings } from '@/data/live-store'
import { notFound } from '@/lib/nav/navigation'

/** Bundled demo catalogue. Content is verbatim from the original template. */
const CARS: CarListing[] = [
    {
      id: 'car-listing://1',
      title: 'Peugeot 108',
      handle: 'peugeot-108',
      badge: 'Guest favourite',
      featuredImage: '/images/catalog/257851-800.webp',
      address: '8953 Golf Course Terrace',
      reviewStart: 5.0,
      reviewCount: 126,
      price: '£124',
      amenities: [
        { icon: 'AirplaneSeatIcon', text: '5 seats' },
        { icon: 'SteeringIcon', text: 'Automatic' },
        { icon: 'Fan01Icon', text: 'A/C' },
        { icon: 'AutomotiveBattery01Icon', text: 'Electric' },
        { icon: 'AutomotiveBattery02Icon', text: '321 mi' },
        { icon: 'Briefcase09Icon', text: '2 suitcases' },
      ],
    },
    {
      id: 'car-listing://2',
      title: 'Vauxhall Corsa',
      badge: 'Guest favourite',
      handle: 'kona-electric',
      featuredImage: '/images/catalog/16188265-800.webp',
      like: true,
      address: '2606 Straubel Crossing',
      reviewStart: 4.6,
      reviewCount: 217,
      price: '£382',
      amenities: [
        { icon: 'AirplaneSeatIcon', text: '5 seats' },
        { icon: 'AutomotiveBattery01Icon', text: 'Electric' },
        { icon: 'AutomotiveBattery02Icon', text: '500 mi' },
        { icon: 'SteeringIcon', text: 'Automatic' },
        { icon: 'Fan01Icon', text: 'A/C' },
        { icon: 'Briefcase09Icon', text: '3 suitcases' },
      ],
    },
    {
      id: 'car-listing://3',
      title: 'Nissan Micra',
      handle: 'nissan-micra',
      badge: 'Popular',
      featuredImage: '/images/catalog/9334967-800.webp',
      like: false,
      address: '14 Petterle Trail',
      reviewStart: 4.8,
      reviewCount: 534,
      price: '£105',
      amenities: [
        { icon: 'AutomotiveBattery01Icon', text: 'Electric' },
        { icon: 'AutomotiveBattery02Icon', text: '311 mi' },
        { icon: 'AirplaneSeatIcon', text: '7 seats' },
        { icon: 'SteeringIcon', text: 'Automatic' },
        { icon: 'Fan01Icon', text: 'A/C' },
        { icon: 'Briefcase09Icon', text: '2 suitcases' },
      ],
    },
    {
      id: 'car-listing://4',
      title: 'Hyundai i30',
      handle: 'hyundai-i30',
      badge: 'Guest favourite',
      featuredImage: '/images/catalog/17623967-800.webp',
      like: true,
      address: '34591 Dawn Park',
      reviewStart: 4.1,
      reviewCount: 527,
      price: '£266',
      amenities: [
        { icon: 'AirplaneSeatIcon', text: '9 seats' },
        { icon: 'SteeringIcon', text: 'Automatic' },
        { icon: 'Fan01Icon', text: 'A/C' },
        { icon: 'AutomotiveBattery01Icon', text: 'Electric' },
        { icon: 'AutomotiveBattery02Icon', text: '855 mi' },
        { icon: 'Briefcase09Icon', text: '2 suitcases' },
      ],
    },
    {
      id: 'car-listing://5',
      title: 'Nissan NV 300',
      handle: 'nissan-nv-300',
      badge: 'Popular',
      featuredImage: '/images/catalog/33303838-800.webp',
      airbags: 6,
      like: false,
      address: '5970 Manley Terrace',
      reviewStart: 4.6,
      reviewCount: 169,
      price: '£268',
      amenities: [
        { icon: 'AirplaneSeatIcon', text: '4 seats' },
        { icon: 'SteeringIcon', text: 'Automatic' },
        { icon: 'AutomotiveBattery02Icon', text: '321 mi' },
        { icon: 'Fan01Icon', text: 'A/C' },
        { icon: 'AutomotiveBattery01Icon', text: 'Electric' },
        { icon: 'Briefcase09Icon', text: '2 suitcases' },
      ],
    },
    {
      id: 'car-listing://6',
      title: 'Nissan Qashqai',
      handle: 'nissan-qashqai',
      badge: 'Guest favourite',
      featuredImage: '/images/catalog/951318-800.webp',
      like: false,
      address: '3 Buhler Point',
      reviewStart: 4.5,
      reviewCount: 33,
      price: '£321',
      amenities: [
        { icon: 'AirplaneSeatIcon', text: '9 seats' },
        { icon: 'AutomotiveBattery01Icon', text: 'Electric' },
        { icon: 'Fan01Icon', text: 'A/C' },
        { icon: 'AutomotiveBattery02Icon', text: '321 mi' },
        { icon: 'SteeringIcon', text: 'Automatic' },
        { icon: 'Briefcase09Icon', text: '2 suitcases' },
      ],
    },
    {
      id: 'car-listing://7',
      title: 'Hyundai Kona',
      handle: 'hyundai-kona',
      badge: '',
      featuredImage: '/images/catalog/5519850-800.webp',
      like: true,
      address: '35 Kedzie Parkway',
      reviewStart: 4.2,
      reviewCount: 468,
      price: '£127',
      amenities: [
        { icon: 'AirplaneSeatIcon', text: '5 seats' },
        { icon: 'SteeringIcon', text: 'Automatic' },
        { icon: 'Fan01Icon', text: 'A/C' },
        { icon: 'AutomotiveBattery01Icon', text: 'Electric' },
        { icon: 'AutomotiveBattery02Icon', text: '321 mi' },
        { icon: 'Briefcase09Icon', text: '2 suitcases' },
      ],
    },
    {
      id: 'car-listing://8',
      title: 'Mitsubishi Mirage',
      handle: 'mitsubishi-mirage',
      badge: 'Guest favourite',
      featuredImage: '/images/catalog/8622800-800.webp',
      like: true,
      address: '466 Glendale Place',
      reviewStart: 4.5,
      reviewCount: 524,
      price: '£146',
      amenities: [
        { icon: 'AirplaneSeatIcon', text: '7 seats' },
        { icon: 'AutomotiveBattery02Icon', text: '577 mi' },
        { icon: 'SteeringIcon', text: 'Automatic' },
        { icon: 'Fan01Icon', text: 'A/C' },
        { icon: 'AutomotiveBattery01Icon', text: 'Electric' },
        { icon: 'Briefcase09Icon', text: '2 suitcases' },
      ],
    },
]

/** The demo catalogue, never the live tenant's. Used as the mapping template at hydration. */
export function getDemoCarListings(): CarListing[] {
  return [...CARS]
}

/** Live tenant listings when hydrated, else the demo catalogue. Always a fresh array. */
export function getCarListings(): CarListing[] {
  return [...(getLiveListings('car') ?? CARS)]
}

/** Detail-page enrichment. Falls back to the first listing for an unknown handle; 404s only on an empty catalogue. */
export function getCarListingByHandle(handle: string): CarListingDetail {
  const listings = getCarListings()
  const listing = listings.find((l) => l.handle === handle) ?? listings[0]
  if (!listing) notFound()
  return {
    ...listing,
    description:
      'Superhosts are experienced, highly rated hosts who are committed to providing great stays for guests.',
    listingCategory: 'Economy',
    bags: 3,
    pickUpAddress: '2 Warner Alley, Neverland',
    pickUpTime: 'Monday, August 12 · 10:00',
    dropOffAddress: '123 Main Street, Neverland',
    dropOffTime: 'Monday, August 16 · 10:00',
    map: { lat: 43.0405, lng: -89.395 },
    galleryImgs: [
      '/images/catalog/381292-1260.webp',
      '/images/catalog/2526128-1260.webp',
      '/images/catalog/2827753-1260.webp',
      '/images/catalog/1637859-1260.webp',
      '/images/catalog/257851-1260.webp',
      '/images/catalog/457418-1600.webp',
      '/images/catalog/1707820-1600.webp',
      '/images/catalog/712618-1600.webp',
      '/images/catalog/752615-1600.webp',
      '/images/catalog/1210622-1600.webp',
      '/images/catalog/303316-1600.webp',
      '/images/catalog/136872-1600.webp',
    ],
    host: {
      displayName: 'John Doe',
      avatarUrl: avatars1.src,
      handle: 'john-doe',
      description: 'Experienced car owner with a passion for sharing my vehicles with others.',
      listingsCount: 3,
      reviewsCount: 150,
      rating: 4.9,
      responseRate: 98,
      responseTime: 'within an hour',
      isSuperhost: true,
      isVerified: true,
      joinedDate: 'January 2023',
    },
  }
}
