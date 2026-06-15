import { getStayListingFilterOptions } from '@/data/data'
import { getStayListings } from '@/data/listings'
import { Metadata } from 'next'
import SectionGridHasMap from './section-grid-has-map'

export async function generateMetadata({ params }: { params: Promise<{ handle?: string[] }> }): Promise<Metadata> {
  const { handle } = await params

  return { title: 'Stays search page', description: 'description' }
}

const Page = async ({ params }: { params: Promise<{ handle?: string[] }> }) => {
  const listings = await getStayListings()
  const filterOptions = await getStayListingFilterOptions()

  return (
    <div className="container px-4 lg:px-8 xl:max-w-none">
      <SectionGridHasMap listings={listings} filterOptions={filterOptions} />
    </div>
  )
}

export default Page
