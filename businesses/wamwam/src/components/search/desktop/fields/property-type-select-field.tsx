import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { HomeIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useState } from "react";
import { Checkbox, CheckboxField, CheckboxGroup } from "@/components/primitives/checkbox";
import { Description, Label } from "@/components/primitives/fieldset";
import type { PropertyType } from "@/types/domain";
import { fieldStyles, type FieldStyle } from "./field-styles";

const PANEL =
    "absolute top-full z-10 mt-3 w-96 transition duration-150 data-closed:translate-y-1 data-closed:opacity-0 left-1/2 -translate-x-1/2 overflow-hidden rounded-3xl bg-white p-7 shadow-lg ring-1 ring-black/5 dark:bg-neutral-800";

const defaultPropertyTypes: PropertyType[] = [
    {
        name: "Duplex House",
        value: "duplex_house",
        description: "Have a place to yourself",
    },
    {
        name: "Ferme House",
        value: "ferme_house",
        description: "Have your own room and share some common spaces",
    },
    {
        name: "Chalet House",
        value: "chalet_house",
        description: "Have a private or shared room in a boutique hotel, hostel.",
    },
    {
        name: "Maison House",
        value: "maison_house",
        description: "Stay in a shared space, like a common room",
    },
];

interface PropertyTypeSelectFieldProps {
    className?: string;
    fieldStyle?: FieldStyle;
    propertyTypes?: PropertyType[];
    description?: string;
    placeholder?: string;
}

export function PropertyTypeSelectField({
    className = "flex-1",
    fieldStyle = "default",
    propertyTypes = defaultPropertyTypes,
    description = "Property type",
    placeholder = "Type",
}: PropertyTypeSelectFieldProps) {
    // Selection is tracked by display name (not value) because the pill renders the names joined.
    const [selectedTypes, setSelectedTypes] = useState<string[]>([propertyTypes[0].name]);
    const typeStringConverted = selectedTypes.join(", ");
    return (
        <Popover className={`group relative z-10 flex ${className}`}>
            {({ open: showPopover }) => (
                <>
                    <PopoverButton
                        aria-label="Select property type"
                        className={clsx(
                            fieldStyles.button.base,
                            fieldStyles.button[fieldStyle],
                            showPopover && fieldStyles.button.focused,
                        )}
                    >
                        {fieldStyle === "default" && (
                            <HomeIcon className="size-5 text-neutral-300 lg:size-7 dark:text-neutral-400" />
                        )}

                        <div className="flex-1">
                            <span className={clsx("block font-[550]", fieldStyles.mainText[fieldStyle])}>
                                <span className="line-clamp-1">{typeStringConverted || placeholder}</span>
                            </span>
                            <span className="mt-1 block text-sm leading-none font-[350] text-neutral-400">{description}</span>
                        </div>
                    </PopoverButton>

                    <PopoverPanel unmount={false} transition className={PANEL}>
                        <CheckboxGroup>
                            {propertyTypes.map((item) => (
                                <CheckboxField key={item.value}>
                                    <Checkbox
                                        name="property_type"
                                        value={item.value}
                                        checked={selectedTypes.includes(item.name)}
                                        onChange={(checked) => {
                                            setSelectedTypes(
                                                checked
                                                    ? [...selectedTypes, item.name]
                                                    : selectedTypes.filter((type) => type !== item.name),
                                            );
                                        }}
                                    />
                                    <Label>{item.name}</Label>
                                    <Description>{item.description}</Description>
                                </CheckboxField>
                            ))}
                        </CheckboxGroup>
                    </PopoverPanel>
                </>
            )}
        </Popover>
    );
}
