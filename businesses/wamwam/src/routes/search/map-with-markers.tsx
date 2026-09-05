import { useEffect, useState } from "react";
import StayCard2 from "@/components/cards/stay-card2";
import { Map, MapControls, MapMarker, MarkerContent, MarkerPopup } from "@/components/media/map";
import type { StayListing } from "@/types/listings";

interface MapWithMarkersProps {
    currentHoverID: string;
    listings: StayListing[];
}

export default function MapWithMarkers({ currentHoverID: selectedID, listings }: MapWithMarkersProps) {
    const [currentHoverID, setCurrentHoverID] = useState<string>("");

    useEffect(() => {
        setCurrentHoverID(selectedID);
    }, [selectedID]);

    // The map centres on the first listing, so a live tenant with an empty
    // catalogue would dereference undefined. Render nothing instead of throwing.
    const first = listings[0];
    if (!first) return null;

    return (
        <Map center={first.map} zoom={11}>
            <MapControls position="bottom-right" showZoom showFullscreen />
            {listings.map((listing) => (
                <MapMarker key={listing.id} longitude={listing.map.lng} latitude={listing.map.lat}>
                    <MarkerContent>
                        <p
                            className={`flex min-w-max items-center justify-center rounded-lg px-3.5 py-1.5 text-sm font-medium shadow-lg transition-all ${
                                currentHoverID === listing.id
                                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                                    : "bg-white text-neutral-900 hover:scale-110 dark:bg-neutral-600 dark:text-white"
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
    );
}
