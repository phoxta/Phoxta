import { Edit02Icon, ViewIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import StayCard2 from "@/components/cards/stay-card2";
import ButtonPrimary from "@/components/primitives/button-primary";
import ButtonSecondary from "@/components/primitives/button-secondary";
import { Divider } from "@/components/primitives/divider";
import { Heading } from "@/components/primitives/heading";
import { getStayListings } from "@/data/listings";

export default function AddListingStep10() {
    // The preview always shows the first catalogue entry; nothing from the wizard is persisted.
    const listing = getStayListings()[0];

    return (
        <>
            <div>
                <Heading>This is your listing</Heading>
                <span className="mt-2 block text-muted-foreground">Preview how your listing looks to guests.</span>
            </div>

            <Divider />

            <div>
                <div className="mt-6 max-w-sm">
                    <StayCard2 data={listing} />
                </div>
                <div className="mt-8 flex items-center gap-x-3">
                    <ButtonSecondary href="/add-listing/1">
                        <HugeiconsIcon icon={Edit02Icon} size={20} />
                        <span>Edit</span>
                    </ButtonSecondary>

                    <ButtonPrimary href="/stay-listings/preview-stay-84763232">
                        <HugeiconsIcon icon={ViewIcon} size={20} />
                        <span>Preview</span>
                    </ButtonPrimary>
                </div>
            </div>
            {/*  */}
            <Divider />
        </>
    );
}
