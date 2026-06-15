import { getBlogPosts } from '@/data/data'
import { getCarListings, getExperienceListings, getStayListings } from '@/data/listings'
import type { MetadataRoute } from 'next'

const BASE_URL = 'https://travel.phoxta.com'

const staticRoutes = [
  '/',
  '/car',
  '/experience',
  '/flight',
  '/stay-search',
  '/stay-search-with-map',
  '/car-search',
  '/experience-search',
  '/flight-search',
  '/stay-categories',
  '/car-categories',
  '/experience-categories',
  '/flight-categories',
  '/blog',
  '/authors',
  '/about',
  '/contact',
  '/subscription',
  '/add-listing/1',
  '/login',
  '/signup',
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [stays, cars, experiences, posts] = await Promise.all([
    getStayListings(),
    getCarListings(),
    getExperienceListings(),
    getBlogPosts(),
  ])

  return [
    ...staticRoutes.map((path) => ({
      url: `${BASE_URL}${path}`,
      changeFrequency: 'weekly' as const,
      priority: path === '/' ? 1 : 0.7,
    })),
    ...stays.map((listing) => ({
      url: `${BASE_URL}/stay-listings/${listing.handle}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...cars.map((listing) => ({
      url: `${BASE_URL}/car-listings/${listing.handle}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...experiences.map((listing) => ({
      url: `${BASE_URL}/experience-listings/${listing.handle}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...posts.map((post) => ({
      url: `${BASE_URL}/blog/${post.handle}`,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
  ]
}
