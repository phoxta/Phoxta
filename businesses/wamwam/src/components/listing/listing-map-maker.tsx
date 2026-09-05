import { Map, MapMarker, MarkerContent, MarkerPopup, MarkerTooltip } from "@/components/media/map";
import type { LatLng } from "@/types/domain";

/** A pin on the detail-page map: the listing's coordinates plus a label. */
export type ListingMapLocation = LatLng & {
    id: number;
    name: string;
};

interface ListingMapMarkerProps {
    location: ListingMapLocation;
}

export function ListingMapMarker({ location }: ListingMapMarkerProps) {
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
    );
}
