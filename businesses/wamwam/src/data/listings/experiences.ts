import avatars1 from '@/assets/images/avatars/Image-1.png'
import type { ExperienceListing, ExperienceListingDetail } from '@/types/listings'
import { getLiveListings } from '@/data/live-store'
import { notFound } from '@/lib/nav/navigation'

/** Bundled demo catalogue. Content is verbatim from the original template. */
const EXPERIENCES: ExperienceListing[] = [
    {
      id: 'experience-listing://1',
      title: 'Generate interactive markets',
      handle: 'generate-interactive-markets',
      badge: 'Popular',
      featuredImage: '/images/catalog/34353414-800.webp',
      like: true,
      address: '2 Warner Alley, Neverland',
      reviewStart: 4.4,
      reviewCount: 478,
      price: '£200',
      amenities: [
        { icon: 'ChefHatIcon', text: 'Chefs' },
        { icon: 'Clock01Icon', text: '3 hours' },
        { icon: 'UserMultipleIcon', text: 'Big group' },
      ],
    },
    {
      id: 'experience-listing://2',
      title: 'Deliver dynamic e-services',
      handle: 'deliver-dynamic-e-services',
      badge: '',
      featuredImage: '/images/catalog/34334642-800.webp',
      like: false,
      address: '620 Clove Park, Toronto',
      reviewStart: 4.2,
      reviewCount: 566,
      price: '£249',
      amenities: [
        { icon: 'EquipmentGym03Icon', text: 'Workout' },
        { icon: 'Clock01Icon', text: '4.5 hours' },
        { icon: 'UserMultipleIcon', text: 'Solo' },
      ],
    },
    {
      id: 'experience-listing://3',
      title: 'Productize holistic deliverables',
      handle: 'productize-holistic-deliverables',
      badge: 'Popular',
      featuredImage: '/images/catalog/36294652-800.webp',
      address: '5 Butterfield Avenue, Chicago',
      reviewStart: 4.5,
      reviewCount: 147,
      price: '£288',
      amenities: [
        { icon: 'ChefHatIcon', text: 'Chefs' },
        { icon: 'Clock01Icon', text: '3 hours' },
        { icon: 'UserMultipleIcon', text: 'Kids' },
      ],
    },
    {
      id: 'experience-listing://4',
      title: 'Deploy integrated solutions',
      handle: 'deploy-integrated-solutions',
      badge: 'Popular',
      featuredImage: '/images/catalog/32315181-800.webp',
      like: true,
      address: '11204 Lawn Court, Springfield',
      reviewStart: 5.0,
      reviewCount: 257,
      price: '£347',
      amenities: [
        { icon: 'ShoppingBag02Icon', text: 'Shopping' },
        { icon: 'Clock01Icon', text: '1.5 hours' },
        { icon: 'UserMultipleIcon', text: '2 guests max' },
      ],
    },
    {
      id: 'experience-listing://5',
      title: 'Evolve virtual models',
      handle: 'evolve-virtual-models',
      badge: '',
      featuredImage: '/images/catalog/30926462-800.webp',
      like: false,
      address: '39 Del Sol Lane, Springfield',
      reviewStart: 4.4,
      reviewCount: 132,
      price: '£387',
      amenities: [
        { icon: 'ShoppingBag02Icon', text: 'Shopping' },
        { icon: 'Clock01Icon', text: '3 hours' },
        { icon: 'UserMultipleIcon', text: '2 guests max' },
      ],
    },
    {
      id: 'experience-listing://6',
      title: 'Seize killer e-commerce',
      handle: 'seize-killer-e-commerce',
      badge: 'Popular',
      featuredImage: '/images/catalog/36377743-800.webp',
      like: false,
      address: '45539 Kensington Drive, Springfield',
      reviewStart: 4.6,
      reviewCount: 275,
      price: '£579',
      amenities: [
        { icon: 'GolfCartIcon', text: 'Food tour' },
        { icon: 'Clock01Icon', text: '1.5 hours' },
        { icon: 'UserMultipleIcon', text: 'Solo' },
      ],
    },
    {
      id: 'experience-listing://7',
      title: 'Generate proactive ROI',
      handle: 'generate-proactive-roi',
      badge: 'Popular',
      featuredImage: '/images/catalog/33636729-800.webp',
      like: true,
      address: '9 Jenifer Way, Spanish Fork',
      reviewStart: 4.4,
      reviewCount: 20,
      price: '£275',
      amenities: [
        { icon: 'ChefHatIcon', text: 'Chefs' },
        { icon: 'Clock01Icon', text: '2.5 hours' },
        { icon: 'UserMultipleIcon', text: '2 guests max' },
      ],
    },
    {
      id: 'experience-listing://8',
      title: 'Aggregate out-of-the-box channels',
      handle: 'aggregate-out-of-the-box-channels',
      badge: 'Popular',
      featuredImage: '/images/catalog/24596729-800.webp',
      like: true,
      address: '5 Aberg Place, New York',
      reviewStart: 4.9,
      reviewCount: 268,
      price: '£770',
      amenities: [
        { icon: 'ChefHatIcon', text: 'Chefs' },
        { icon: 'Clock01Icon', text: '2.5 hours' },
        { icon: 'UserMultipleIcon', text: '2 guests max' },
      ],
    },
]

/** The demo catalogue, never the live tenant's. Used as the mapping template at hydration. */
export function getDemoExperienceListings(): ExperienceListing[] {
  return [...EXPERIENCES]
}

/** Live tenant listings when hydrated, else the demo catalogue. Always a fresh array. */
export function getExperienceListings(): ExperienceListing[] {
  return [...(getLiveListings('experience') ?? EXPERIENCES)]
}

/** Detail-page enrichment. Falls back to the first listing for an unknown handle; 404s only on an empty catalogue. */
export function getExperienceListingByHandle(handle: string): ExperienceListingDetail {
  const listings = getExperienceListings()
  const listing = listings.find((l) => l.handle === handle) ?? listings[0]
  if (!listing) notFound()
  return {
    ...listing,
    description:
      "See over 30 London sights in 1 day! Your fun local guide will make sure you don't miss anything! This will give you a good idea of the history, culture, and legends of Europe’s best-loved city.",
    listingCategory: 'Workout',
    galleryImgs: [
      listing.featuredImage,
      '/images/catalog/4348078-1600.webp',
      '/images/catalog/3825527-1600.webp',
      '/images/catalog/4706134-1600.webp',
      '/images/catalog/3825578-1600.webp',
      '/images/catalog/123335-1600.webp',
      '/images/catalog/3761124-1600.webp',
      '/images/catalog/8926846-1600.webp',
      '/images/catalog/4706139-1600.webp',
      '/images/catalog/7003624-1600.webp',
      '/images/catalog/4348078-1600.webp',
      '/images/catalog/3825527-1600.webp',
    ],
    host: {
      displayName: 'Jane Smith',
      avatarUrl: avatars1.src,
      handle: 'jane-smith',
      description:
        'Superhosts are experienced, highly rated hosts who are committed to providing great stays for guests.',
      listingsCount: 5,
      reviewsCount: 120,
      rating: 4.8,
      responseRate: 95,
      responseTime: 'within an hour',
      isSuperhost: true,
      isVerified: true,
      joinedDate: 'March 2024',
      timeAsHost: {
        years: 2,
        months: 3,
      },
    },
    map: { lat: 43.0405, lng: -89.395 },
  }
}
