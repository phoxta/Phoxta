import { Map, MapMarker, MarkerContent, MarkerPopup, MarkerTooltip } from '@/components/ui/map'

const location_demo = {
  id: 1,
  name: 'Empire State Building',
  lng: -73.9857,
  lat: 40.7484,
}

interface ListingMapMakerProps {
  location: {
    id: number
    name: string
    lng: number
    lat: number
  }
}

export function ListingMapMarker({ location = location_demo }: ListingMapMakerProps) {
  return (
    <Map center={[location.lng, location.lat]} zoom={12}>
      <MapMarker key={location.id} longitude={location.lng} latitude={location.lat}>
        <MarkerContent>
          <div className="flex size-11 items-center justify-center rounded-full border-2 border-white bg-black shadow-lg">
            <div className="flex size-3 rounded-full bg-white" />
          </div>
        </MarkerContent>
        <MarkerTooltip>{location.name}</MarkerTooltip>
        <MarkerPopup>
          <div className="space-y-1">
            <p className="font-medium text-foreground">{location.name}</p>
            <p className="text-xs text-muted-foreground">
              {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </p>
          </div>
        </MarkerPopup>
      </MapMarker>
    </Map>
  )
}
