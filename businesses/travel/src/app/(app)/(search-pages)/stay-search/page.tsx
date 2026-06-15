import { Divider } from '@/components/divider'
import ListingFilterTabs from '@/components/listing-filter-tabs'
import Pagination from '@/components/pagination'
import StayCard2 from '@/components/stay-card2'
import { getStayListingFilterOptions } from '@/data/data'
import { getStayListings } from '@/data/listings'
import { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ handle?: string[] }> }): Promise<Metadata> {
  return { title: 'Search stays', description: 'Find your perfect stay' }
}

const Page = async ({ params }: { params: Promise<{ handle?: string[] }> }) => {
  const listings = await getStayListings()
  const filterOptions = await getStayListingFilterOptions()

  return (
    <div className="relative pb-28">
      <ListingFilterTabs filterOptions={filterOptions} className="container mt-6 flex justify-center lg:mt-3" />

      <Divider className="my-6 lg:my-9" />

      {/* Content */}
      <div className="relative container">
        <h2 id="heading" className="scroll-mt-20 text-lg font-[550] lg:text-xl">
          Explore over 12,000 homes
        </h2>

        <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 md:gap-y-12 lg:mt-6 lg:grid-cols-3 xl:gap-x-8 2xl:grid-cols-4 2xl:gap-x-7">
          {listings.map((listing) => (
            <StayCard2 key={listing.id} data={listing} />
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
