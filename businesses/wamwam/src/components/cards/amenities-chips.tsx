import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import clsx from "clsx";
import type { ComponentPropsWithoutRef } from "react";
import { ICONS_MAP } from "@/data/icons";
import type { Amenity } from "@/types/listings";

/** Neutral pill. Its classes are fixed: a caller's `className` is overridden, as it always was. */
export function LightChip(props: ComponentPropsWithoutRef<"span">) {
    return (
        <span
            {...props}
            className={clsx(
                "inline-flex items-center gap-x-1.5 rounded-full px-2 py-0.5 text-xs/5 font-[420] forced-colors:outline",
                "bg-neutral-600/8 text-neutral-700 group-data-hover:bg-neutral-600/20 dark:bg-white/5 dark:text-neutral-400 dark:group-data-hover:bg-white/10",
            )}
        />
    );
}

const DEMO_DATA: Amenity[] = [
    { icon: "BedSingle02Icon", text: "5 beds" },
    { icon: "Wifi01Icon", text: "Free wifi" },
    { icon: "CarParking01Icon", text: "Free parking" },
    { icon: "KitchenUtensilsIcon", text: "Kitchen" },
    { icon: "Beach02FreeIcons", text: "Beachfront" },
    { icon: "PinLocation03Icon", text: "City center" },
];

interface AmenitiesChipsProps {
    className?: string;
    data?: Amenity[];
}

export default function AmenitiesChips({ className, data = DEMO_DATA }: AmenitiesChipsProps) {
    return (
        <div className={clsx("flex flex-wrap items-center gap-1.5", className)}>
            {data.map((item, index) => (
                <LightChip key={index}>
                    {/* Unknown icon keys (live data) fall back to a generic check so the chip never renders empty. */}
                    <HugeiconsIcon
                        icon={ICONS_MAP[item.icon] || CheckmarkCircle02Icon}
                        size={16}
                        color="currentColor"
                        strokeWidth={1.5}
                    />
                    {item.text}
                </LightChip>
            ))}
        </div>
    );
}
