import { MapPinIcon } from "@heroicons/react/24/outline";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import clsx from "clsx";
import { useEffect, useState, type KeyboardEvent } from "react";

interface LocationInputProps {
    /** Every value change — typing and suggestion picks alike — so the parent's summary row stays in sync. */
    onChange?: (value: string) => void;
    /** A suggestion pick only; the parent uses it to advance to the next step. */
    onSelect?: (value: string) => void;
    className?: string;
    defaultValue?: string;
    headingText?: string;
    inputName?: string;
}

export default function LocationInput({
    onChange,
    onSelect,
    className,
    defaultValue = "United States",
    headingText = "Where to?",
    inputName = "location",
}: LocationInputProps) {
    const [value, setValue] = useState("");

    useEffect(() => {
        setValue(defaultValue);
    }, [defaultValue]);

    const handleSelectLocation = (item: string) => {
        // Deferred on purpose: the parent collapses this panel on select, and the
        // row must finish its click before the Transition hides it.
        setTimeout(() => {
            setValue(item);
            onChange?.(item);
            onSelect?.(item);
        }, 0);
    };

    const onRowKeyDown = (e: KeyboardEvent<HTMLDivElement>, item: string) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleSelectLocation(item);
        }
    };

    const renderSearchValues = ({ heading, items }: { heading: string; items: string[] }) => {
        return (
            <>
                <p className="block text-base font-semibold">{heading || "Destinations"}</p>
                <div className="mt-3">
                    {items.map((item) => {
                        return (
                            <div
                                className="mb-1 flex items-center gap-x-3 py-2 text-sm"
                                role="button"
                                tabIndex={0}
                                onClick={() => handleSelectLocation(item)}
                                onKeyDown={(e) => onRowKeyDown(e, item)}
                                key={item}
                            >
                                <MapPinIcon className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
                                <span>{item}</span>
                            </div>
                        );
                    })}
                </div>
            </>
        );
    };

    return (
        <div className={clsx(className)}>
            <h3 className="text-xl font-semibold sm:text-2xl">{headingText}</h3>
            <div className="relative mt-5">
                <input
                    className="block w-full truncate rounded-xl border border-neutral-300 bg-transparent px-4 py-3 pe-12 leading-none font-normal placeholder-neutral-500 placeholder:truncate focus:border-gray-300 focus:ring-3 focus:ring-primary/50 sm:text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:placeholder-neutral-300 dark:focus:ring-primary/25"
                    placeholder="Search destinations"
                    value={value}
                    onChange={(e) => {
                        setValue(e.currentTarget.value);
                        onChange?.(e.currentTarget.value);
                    }}
                    name={inputName}
                    autoComplete="off"
                    autoFocus
                    data-autofocus
                />
                <span className="absolute end-2.5 top-1/2 -translate-y-1/2">
                    <HugeiconsIcon icon={Search01Icon} className="h-5 w-5 text-neutral-700 dark:text-neutral-400" />
                </span>
            </div>
            <div className="mt-7">
                {value
                    ? // Anything typed: matches for the query.
                      renderSearchValues({
                          heading: "Locations",
                          items: ["Afghanistan", "Albania", "Algeria", "American Samao", "Andorra"],
                      })
                    : // Empty: popular picks.
                      renderSearchValues({
                          heading: "Popular destinations",
                          items: ["Australia", "Canada", "Germany", "United Kingdom", "United Arab Emirates"],
                      })}
            </div>
        </div>
    );
}
