import { Divider } from '@/components/divider'
import FlightCard from '@/components/flight-card'
import ListingFilterTabs from '@/components/listing-filter-tabs'
import Pagination from '@/components/pagination'
import HeroSection4 from '@/components/section-hero-4'
import { getFlightCategoryByHandle } from '@/data/categories'
import { getFlightFilterOptions } from '@/data/data'
import { getFlightListings } from '@/data/listings'
import flightHeroImg from '@/images/hero-img-flight.webp'
import convertNumbThousand from '@/utils/convert-numb-thousand'
import { Airplane02Icon } from '@hugeicons/core-free-icons'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'

export function generateMetadata({ params }: { params: Promise<{ handle?: string[] }> }): Promise<Metadata> {
  const { handle } = params
  const category = getFlightCategoryByHandle(handle?.[0])
  if (!category) {
    return {
      title: 'Collection not found',
      description: 'The collection you are looking for does not exist.',
    }
  }
  const { name, description } = category
  return { title: name, description }
}

const Page = ({ params }: { params: Promise<{ handle?: string[] }> }) => {
  const { handle } = params

  const category = getFlightCategoryByHandle(handle?.[0])
  const listings = getFlightListings()
  const filterOptions = getFlightFilterOptions()

  if (!category?.id) {
    return redirect('/flight')
  }

  return (
    <div className="relative container pb-28">
      <HeroSection4
        heroImg={flightHeroImg}
        heading={category.titleRaw}
        subHeading={`Over 80 flights ${category.name}`}
        subHeadingIcon={Airplane02Icon}
        searchFormInitTab="Flights"
      />

      <ListingFilterTabs
        className="mt-20 justify-center"
        filterOptions={filterOptions}
        optionPanelAnchor="bottom start"
      />

      <Divider className="my-8 md:my-12" />
      <h2 id="heading" className="scroll-mt-20 text-lg font-medium">
        Showing {convertNumbThousand(category.count)} results
      </h2>

      <div className="mt-7 grid grid-cols-1 gap-y-8">
        {listings.map((listing) => (
          <FlightCard key={listing.id} data={listing} />
        ))}
      </div>

      <div className="mt-20 flex items-center justify-center">
        <Pagination />
      </div>
    </div>
  )
}

export default Page
