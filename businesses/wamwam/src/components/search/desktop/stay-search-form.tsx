import { DestinationSearchForm, type DestinationSearchFormProps } from "./experiences-search-form";

/** The stays variant: same pill, results on the map page, DateRangeField's default sub-label. */
export function StaySearchForm(props: DestinationSearchFormProps) {
    return <DestinationSearchForm {...props} searchPath="/stay-search-with-map" />;
}
