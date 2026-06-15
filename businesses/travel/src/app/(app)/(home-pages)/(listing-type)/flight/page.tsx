import SectionGridPosts3 from '@/components/blog/section-grid-post-3'
import { Button } from '@/components/button'
import FeatureSection2 from '@/components/feature-section-2'
import { Heading } from '@/components/heading'
import InspirationFutureGetawaysSection from '@/components/inspiration-future-getaways-section'
import NewsletterSection from '@/components/newsletter-section-1'
import SectionCategoriesCarousel from '@/components/section-categories-carousel'
import SectionDreamDestination from '@/components/section-dream-destination'
import SectionGridCategoryBox from '@/components/section-grid-category-box'
import HeroSection3 from '@/components/section-hero-3'
import SectionHowItWork2 from '@/components/section-how-it-work-2'
import LogoCloud from '@/components/section-logo-cloud'
import SectionWhyUs from '@/components/section-why-us'
import { getFlightCategories } from '@/data/categories'
import { getBlogPosts } from '@/data/data'
import flightHeroImg from '@/images/hero-img-flight.webp'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Flight',
  description: 'Home page of the flight application',
}

async function Page() {
  const categories = await getFlightCategories()
  const posts = await getBlogPosts()

  return (
    <main className="relative section-space-bottom">
      <div className="px-4">
        <HeroSection3
          initTab="Flights"
          title={
            <>
              Book your <span data-slot="italic">flight</span> tickets
            </>
          }
          heroImg={flightHeroImg}
        />
      </div>

      <div className="container section-space-smaller pb-0!">
        <LogoCloud />
        <section className="section-space sm:mt-2.5">
          <SectionHowItWork2 heading="" subHeading="" />
        </section>
      </div>

      <section className="container section-space">
        <SectionDreamDestination />
      </section>

      <section className="container section-space">
        <InspirationFutureGetawaysSection heading="" />
      </section>

      <section className="container section-space">
        <SectionCategoriesCarousel
          heading={
            <>
              Explore by <span data-slot="italic">destination</span> or <span data-slot="italic">country</span>
            </>
          }
          categories={categories.slice(6, 14)}
          cardStyle="4"
        />
      </section>

      <section className="container section-space">
        <SectionWhyUs />
      </section>

      <section className="container section-space">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-5">
          <Heading>
            Popular flights <span data-slot="italic">near by you</span>
          </Heading>
          <Button color="light">
            Explore destinations
            <ArrowRightIcon className="size-4!" />
          </Button>
        </div>
        <SectionGridCategoryBox categories={categories.slice(0, 8)} />
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
