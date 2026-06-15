import SectionGridPosts3 from '@/components/blog/section-grid-post-3'
import { Button } from '@/components/button'
import FeatureSection2 from '@/components/feature-section-2'
import { Heading } from '@/components/heading'
import InspirationFutureGetawaysSection from '@/components/inspiration-future-getaways-section'
import NewsletterSection from '@/components/newsletter-section-1'
import SectionDreamDestination from '@/components/section-dream-destination'
import SectionGridAuthorBox from '@/components/section-grid-author-box'
import SectionGridCategoryBox from '@/components/section-grid-category-box'
import SectionGridFeaturedListings from '@/components/section-grid-featured-listings'
import SectionGroupCategoriesCarousel from '@/components/section-group-categories-carousel'
import HeroSection3 from '@/components/section-hero-3'
import SectionHowItWork2 from '@/components/section-how-it-work-2'
import SectionInterestingInfor from '@/components/section-interesting-infor'
import SectionListingsCarousel from '@/components/section-listings-carousel'
import LogoCloud from '@/components/section-logo-cloud'
import SectionWhyUs from '@/components/section-why-us'
import { Text } from '@/components/text'
import { getAuthors } from '@/data/authors'
import { getGroupStayCategories, getStayCategories } from '@/data/categories'
import { getBlogPosts } from '@/data/data'
import { getStayListings } from '@/data/listings'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import { Metadata } from 'next'

export const metadata: Metadata = {
  description: 'Soar by Phoxta — find and book stays around the world.',
}

async function Page() {
  const categories = await getStayCategories()
  const stayListings = await getStayListings()
  const authors = await getAuthors()
  const groupCategories = await getGroupStayCategories()
  const posts = await getBlogPosts()

  return (
    <main className="relative section-space-bottom">
      <section className="px-4">
        <HeroSection3 />
      </section>

      <section className="container section-space-smaller pb-0!">
        <LogoCloud />
        <div className="section-space sm:mt-10">
          <SectionDreamDestination />
        </div>
      </section>

      <section className="container section-space">
        <InspirationFutureGetawaysSection heading="" className="text-center" />
      </section>

      <section className="container section-space">
        <SectionGridFeaturedListings stayListings={stayListings.slice(0, 4)} />
      </section>

      <section className="container section-space">
        <SectionGroupCategoriesCarousel groupCategories={groupCategories} />
      </section>

      <section className="container section-space">
        <SectionInterestingInfor />
      </section>
      <section className="container section-space">
        <SectionHowItWork2 />
      </section>

      <section className="container section-space">
        <SectionListingsCarousel listings={stayListings.slice(0, 8)} cardType="stay" />
      </section>
      <section className="container py-12">
        <SectionListingsCarousel
          listings={stayListings.slice(0, 8).reverse()}
          cardType="stay"
          heading={`Popular homes <span data-slot="italic">in Bali</span>`}
        />
      </section>
      <section className="container section-space">
        <div className="mb-11 flex flex-wrap items-end justify-between gap-5">
          <Heading>
            Explore <span data-slot="italic">near by you</span>
          </Heading>
          <Button color="light" href="/stay-search-with-map">
            Explore destinations
            <ArrowRightIcon className="size-4! rtl:rotate-180" />
          </Button>
        </div>
        <SectionGridCategoryBox categories={categories.slice(0, 8)} />
      </section>

      <section className="container section-space">
        <SectionWhyUs />
      </section>

      <section className="container section-space">
        <Heading>
          Stay with top-rated <span data-slot="italic">hosts</span>
        </Heading>
        <Text className="mt-3 max-w-lg text-neutral-600 dark:text-neutral-400">
          Selected for their exceptional hospitality and top-rated properties.
        </Text>
        <SectionGridAuthorBox className="mt-13" boxCard="box1" authors={authors} />
      </section>

      <section className="container section-space">
        <FeatureSection2 variant="up" />
      </section>

      <section className="container section-space">
        <SectionGridPosts3 posts={posts.slice(0, 4)} />
      </section>

      <section className="container py-12 lg:py-16">
        <NewsletterSection />
      </section>
    </main>
  )
}

export default Page
