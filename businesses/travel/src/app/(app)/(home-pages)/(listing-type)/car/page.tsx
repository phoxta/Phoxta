import SectionGridPosts3 from '@/components/blog/section-grid-post-3'
import { Button } from '@/components/button'
import FeatureSection2 from '@/components/feature-section-2'
import { Heading } from '@/components/heading'
import HeroSection1 from '@/components/hero-section-1'
import NewsletterSection from '@/components/newsletter-section-1'
import SectionGridCategoryBox from '@/components/section-grid-category-box'
import HeroSection3 from '@/components/section-hero-3'
import SectionHowItWork2 from '@/components/section-how-it-work-2'
import SectionListingsCarousel from '@/components/section-listings-carousel'
import LogoCloud from '@/components/section-logo-cloud'
import SectionWhyUs from '@/components/section-why-us'
import { getCarCategories } from '@/data/categories'
import { getBlogPosts } from '@/data/data'
import { getCarListings } from '@/data/listings'
import carHeroImg from '@/images/hero-img-car.webp'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Car rental',
  description: 'Home page of the Car rental application',
}

async function Page() {
  const categories = await getCarCategories()
  const carListings = await getCarListings()
  const posts = await getBlogPosts()

  return (
    <main className="relative section-space-bottom">
      <div className="px-4">
        <HeroSection3
          initTab="Cars"
          heroImg={carHeroImg}
          title={
            <>
              Rent a car for <span data-slot="italic"> any </span>trip.
              {/* Discover of <span data-slot="italic">car rentals</span> tailored to your needs. */}
            </>
          }
        />
      </div>

      <div className="container section-space-smaller pb-0!">
        <LogoCloud />
        <div className="section-space sm:mt-4">
          <HeroSection1 />
        </div>
      </div>

      <section className="container section-space">
        <div className="mb-11 flex flex-wrap items-end justify-between gap-5">
          <Heading>
            Popular car rental <span data-slot="italic">destinations</span>
          </Heading>
          <Button color="light">
            Explore destinations
            <ArrowRightIcon className="size-4!" />
          </Button>
        </div>
        <SectionGridCategoryBox categories={categories.slice(0, 8)} />
      </section>

      <section className="container py-12">
        <SectionListingsCarousel
          heading={`Great car rental deals <span data-slot="italic">in Bali</span>`}
          listings={carListings.slice(0, 7)}
          cardType="car"
        />
      </section>

      <section className="container section-space-smaller">
        <SectionListingsCarousel
          heading={`Great car rental deals <span data-slot="italic">in Rome</span>`}
          listings={carListings.reverse().slice(0, 7)}
          cardType="car"
        />
      </section>

      <section className="container section-space">
        <SectionWhyUs />
      </section>

      <section className="container section-space">
        <SectionHowItWork2 />
      </section>

      <section className="container section-space">
        <FeatureSection2 variant="up" />
      </section>

      <section className="container section-space">
        <SectionGridPosts3 posts={posts.slice(0, 4)} />
      </section>

      <section className="container section-space-smaller">
        <NewsletterSection />
      </section>
    </main>
  )
}

export default Page
