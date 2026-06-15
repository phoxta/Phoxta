import { Divider } from '@/components/divider'
import { ListingMapMarker } from './listing-map-maker'
import { SectionHeading, SectionSubheading } from './section-heading'

interface Props {
  className?: string
  heading?: string
  subheading?: string
  location: {
    id: number
    name: string
    lng: number
    lat: number
  }
}

const SectionMap = ({ className, heading, subheading, location }: Props) => {
  return (
    <div className="listingSection__wrap">
      {/* HEADING */}
      <div>
        <SectionHeading>Location</SectionHeading>
        <SectionSubheading> San Diego, CA, United States of America (SAN-San Diego Intl.) </SectionSubheading>
      </div>
      <Divider className="w-14!" />

      {/* MAP */}
      <div className="h-96 w-full overflow-hidden rounded-xl sm:h-120">
        <ListingMapMarker location={location} />
      </div>
    </div>
  )
}

export default SectionMap
