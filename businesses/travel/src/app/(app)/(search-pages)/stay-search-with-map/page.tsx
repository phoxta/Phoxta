import { getStayListingFilterOptions } from '@/data/data'
import { getStayListings } from '@/data/listings'
import { Metadata } from 'next'
import SectionGridHasMap from './section-grid-has-map'

export function generateMetadata({ params }: { params: Promise<{ handle?: string[] }> }): Promise<Metadata> {
  const { handle } = params

  return { title: 'Stays search page', description: 'description' }
}

const Page = ({ params }: { params: Promise<{ handle?: string[] }> }) => {
  const listings = getStayListings()
  const filterOptions = getStayListingFilterOptions()

  return (
    <div className="container px-4 lg:px-8 xl:max-w-none">
      <SectionGridHasMap listings={listings} filterOptions={filterOptions} />
    </div>
  )
}

export default Page
