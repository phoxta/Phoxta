import { ApplicationLayout } from '@/app/application-layout'
import { Button } from '@/components/button'
import { Divider } from '@/components/divider'
import FeatureSection2 from '@/components/feature-section-2'
import { Heading } from '@/components/heading'
import NewsletterSection from '@/components/newsletter-section-1'
import SectionGridCategoryBox from '@/components/section-grid-category-box'
import { getStayCategories } from '@/data/categories'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import { ReactNode } from 'react'

const Layout = async ({ children }: { children: ReactNode }) => {
  const categories = (await getStayCategories()).slice(0, 8)

  return (
    <ApplicationLayout>
      {children}

      <div className="container mb-24 flex flex-col gap-y-20 lg:mb-28 lg:gap-y-28">
        <Divider />

        <section>
          <div className="mb-12 flex flex-wrap items-end justify-between gap-5">
            <Heading>
              Explore <span data-slot="italic">near by you</span>
            </Heading>
            <Button color="light">
              Explore destinations
              <ArrowRightIcon className="size-4!" />
            </Button>
          </div>
          <SectionGridCategoryBox categories={categories.slice(0, 8)} />
        </section>
        <FeatureSection2 variant="up" />
        <NewsletterSection />
      </div>
    </ApplicationLayout>
  )
}

export default Layout
