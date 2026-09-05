import { Wifi01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { SectionHeading } from "@/components/listing/section-heading";
import { Button } from "@/components/primitives/button";
import { Dialog, DialogBody, DialogTitle } from "@/components/primitives/dialog";
import { Divider } from "@/components/primitives/divider";
import { ICONS_MAP } from "@/data/icons";
import type { Amenity } from "@/types/listings";

interface SectionAmenitiesProps {
    amenities: Amenity[];
}

export default function SectionAmenities({ amenities }: SectionAmenitiesProps) {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <>
            <div className="listingSection__wrap">
                <SectionHeading>Amenities</SectionHeading>

                <div className="grid grid-cols-1 gap-6 text-sm text-gray-700 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 dark:text-gray-300">
                    {amenities.slice(0, 9).map((item) => (
                        <div key={item.text} className="flex items-center gap-x-3">
                            <HugeiconsIcon icon={ICONS_MAP[item.icon] || Wifi01Icon} size={24} />
                            <span>{item.text}</span>
                        </div>
                    ))}
                </div>

                <div>
                    <Button onClick={() => setIsOpen(true)} outline>
                        Show all {amenities.length} amenities
                    </Button>
                </div>
            </div>

            <Dialog open={isOpen} onClose={setIsOpen}>
                <DialogTitle>What this place offers</DialogTitle>

                <DialogBody>
                    <Divider className="my-7" />
                    <div className="grid grid-cols-1 gap-6 text-sm text-gray-700 dark:text-gray-300">
                        {amenities.map((item) => (
                            <div key={item.text} className="flex items-center gap-x-3">
                                <HugeiconsIcon icon={ICONS_MAP[item.icon] || Wifi01Icon} size={24} />
                                <span>{item.text}</span>
                            </div>
                        ))}
                    </div>
                </DialogBody>
            </Dialog>
        </>
    );
}
