import StayCard2 from '@/components/stay-card2'
import { Map, MapControls, MapMarker, MarkerContent, MarkerPopup } from '@/components/ui/map'
import { TStayListing } from '@/data/listings'
import { useEffect, useState } from 'react'

interface Props {
  currentHoverID: string
  listings: TStayListing[]
}

const MapWithMarkers = ({ currentHoverID: selectedID, listings }: Props) => {
  const [currentHoverID, setCurrentHoverID] = useState<string>('')

  useEffect(() => {
    setCurrentHoverID(selectedID)
  }, [selectedID])

  return (
    <Map center={listings[0].map} zoom={11}>
      <MapControls position="bottom-right" showZoom showFullscreen />
      {listings.map((listing) => (
        <MapMarker key={listing.id} longitude={listing.map.lng} latitude={listing.map.lat}>
          <MarkerContent>
            <p
              className={`flex min-w-max items-center justify-center rounded-lg px-3.5 py-1.5 text-sm font-medium shadow-lg transition-all ${
                currentHoverID === listing.id
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'bg-white text-neutral-900 hover:scale-110 dark:bg-neutral-600 dark:text-white'
              }`}
            >
              {listing.price}
            </p>
          </MarkerContent>
          <MarkerPopup className="rounded-3xl p-1 pb-4">
            <div className="w-60 sm:w-80">
              <StayCard2 ratioClassName="aspect-4/3" data={listing} />
            </div>
          </MarkerPopup>
        </MapMarker>
      ))}
    </Map>
  )
}

export default MapWithMarkers
