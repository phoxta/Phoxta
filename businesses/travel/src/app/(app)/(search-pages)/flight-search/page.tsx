import { Divider } from '@/components/divider'
import FlightCard from '@/components/flight-card'
import ListingFilterTabs from '@/components/listing-filter-tabs'
import Pagination from '@/components/pagination'
import { getFlightFilterOptions } from '@/data/data'
import { getFlightListings } from '@/data/listings'
import { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ handle?: string[] }> }): Promise<Metadata> {
  return { title: 'Search flights', description: 'Find your perfect flight' }
}

const Page = async ({ params }: { params: Promise<{ handle?: string[] }> }) => {
  const listings = await getFlightListings()
  const filterOptions = await getFlightFilterOptions()

  return (
    <div className="relative pb-28">
      <ListingFilterTabs filterOptions={filterOptions} className="container mt-6 flex justify-center lg:mt-3" />

      <Divider className="my-6 lg:my-9" />

      {/* Content */}
      <div className="relative container">
        <h2 id="heading" className="scroll-mt-20 text-lg font-[550] lg:text-xl">
          Explore over 10,000 flights
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
    </div>
  )
}

export default Page
