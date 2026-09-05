import { ListingMapMarker, type ListingMapLocation } from "@/components/listing/listing-map-maker";
import { SectionHeading, SectionSubheading } from "@/components/listing/section-heading";
import { Divider } from "@/components/primitives/divider";

interface SectionMapProps {
    location: ListingMapLocation;
}

export default function SectionMap({ location }: SectionMapProps) {
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
    );
}
