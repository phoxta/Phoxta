import HeroSection4 from '@/components/section-hero-4'
import SectionListingsCarousel from '@/components/section-listings-carousel'
import { getExperienceCategoryByHandle } from '@/data/categories'
import { getExperienceListings } from '@/data/listings'
import heroImg from '@/images/hero-img-exp.webp'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'

export async function generateMetadata({ params }: { params: Promise<{ handle?: string[] }> }): Promise<Metadata> {
  const { handle } = await params
  const category = await getExperienceCategoryByHandle(handle?.[0])
  if (!category) {
    return {
      title: 'Collection not found',
      description: 'The collection you are looking for does not exist.',
    }
  }
  const { name, description } = category
  return { title: name, description }
}

const Page = async ({ params }: { params: Promise<{ handle?: string[] }> }) => {
  const { handle } = await params

  const category = await getExperienceCategoryByHandle(handle?.[0])
  const listings = await getExperienceListings()

  if (!category?.id) {
    return redirect('/experience')
  }

  return (
    <div className="relative container space-y-20 pb-28 sm:space-y-24">
      <HeroSection4
        heading={category.titleRaw}
        subHeading={`${category.count} experiences in ${category.name}`}
        heroImg={heroImg}
      />

      {/* Collection demo */}
      <SectionListingsCarousel
        heading={`Top-rated experiences <span data-slot="italic">in ${category.name}</span>`}
        headingFontClassName="text-2xl sm:text-3xl xl:text-4xl"
        subHeading="View our most highly rated experiences, loved by guests."
        listings={listings.slice(0, 8)}
        cardType="experience"
      />

      {/* Collection demo */}
      <SectionListingsCarousel
        heading={`Top-rated <span data-slot="italic">art and culture</span> activities`}
        headingFontClassName="text-2xl sm:text-3xl xl:text-4xl"
        listings={listings.slice(2, 10)}
        cardType="experience"
      />

      {/* Collection demo */}
      <SectionListingsCarousel
        heading={`Top-rated <span data-slot="italic">food and drink</span> activities`}
        headingFontClassName="text-2xl sm:text-3xl xl:text-4xl"
        listings={listings.slice(0, 8)}
        cardType="experience"
      />
    </div>
  )
}

export default Page
