import * as Headless from "@headlessui/react";
import { MapPinIcon } from "@heroicons/react/24/outline";
import {
    BeachIcon,
    EiffelTowerIcon,
    HutIcon,
    LakeIcon,
    Location01Icon,
    TwinTowerIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Divider } from "@/components/primitives/divider";
import { useInteractOutside } from "@/hooks/use-interact-outside";
import { ClearDataButton } from "./clear-data-button";
import { fieldStyles, type FieldStyle } from "./field-styles";

export interface Suggest {
    id: string;
    name: string;
    icon?: IconSvgElement;
}

const demoInitSuggests: Suggest[] = [
    { id: "1", name: "Bangkok, Thailand", icon: HutIcon },
    { id: "2", name: "Ueno, Taito, Tokyo", icon: EiffelTowerIcon },
    { id: "3", name: "Ikebukuro, Toshima, Tokyo", icon: TwinTowerIcon },
    { id: "4", name: "San Diego, CA", icon: BeachIcon },
    { id: "5", name: "Humboldt Park, Chicago, IL", icon: LakeIcon },
];

const demoSearchingSuggests: Suggest[] = [
    { id: "1", name: "San Diego, CA" },
    { id: "2", name: "Humboldt Park, Chicago, IL" },
    { id: "3", name: "Bangor, Northern Ireland" },
    { id: "4", name: "New York, NY, United States" },
    { id: "5", name: "Los Angeles, CA, United States" },
];

const styles = {
    input: {
        base: "block w-full truncate border-none bg-transparent p-0 font-[550] placeholder-neutral-800 focus:placeholder-neutral-300 focus:ring-0 focus:outline-hidden dark:placeholder-neutral-200",
        default: "text-base xl:text-lg",
        small: "text-base",
    },
    panel: {
        base: "absolute start-0 top-full z-40 mt-3 hidden-scrollbar max-h-96  overflow-y-auto rounded-3xl bg-white py-3 shadow-xl transition duration-150 data-closed:translate-y-1 data-closed:opacity-0  dark:bg-neutral-800 text-left",
        default: "w-lg sm:py-6",
        small: "w-md sm:py-5",
    },
};

/** Trailing-edge debounce with a `cancel` for unmount; the one thing lodash was imported for. */
function debounce<A extends unknown[]>(fn: (...args: A) => void, wait: number) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return Object.assign(
        (...args: A) => {
            if (timer !== undefined) clearTimeout(timer);
            timer = setTimeout(() => {
                timer = undefined;
                fn(...args);
            }, wait);
        },
        {
            cancel() {
                if (timer !== undefined) clearTimeout(timer);
                timer = undefined;
            },
        },
    );
}

interface LocationInputFieldProps {
    placeholder?: string;
    description?: string;
    className?: string;
    inputName?: string;
    initSuggests?: Suggest[];
    searchingSuggests?: Suggest[];
    fieldStyle?: FieldStyle;
}

export function LocationInputField({
    placeholder = "Location",
    description = "Where are you going?",
    className = "flex-1",
    inputName = "location",
    initSuggests = demoInitSuggests,
    searchingSuggests = demoSearchingSuggests,
    fieldStyle = "default",
}: LocationInputFieldProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [showPopover, setShowPopover] = useState(false);
    const [selected, setSelected] = useState<Suggest | null>(null);

    // Focus lands after the panel's 150 ms enter transition, not on top of it.
    useEffect(() => {
        const inputFocusTimeout = setTimeout(() => {
            if (showPopover && inputRef.current) {
                inputRef.current.focus();
            }
        }, 200);
        return () => {
            clearTimeout(inputFocusTimeout);
        };
    }, [showPopover]);

    // Stable identity: useInteractOutside re-binds its listeners when the handler changes.
    const closePopover = useCallback(() => {
        setShowPopover(false);
    }, []);

    useInteractOutside(containerRef, closePopover);

    const onInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setShowPopover(true);
        // An emptied input is reset to null by the Combobox itself.
        if (e.target.value) {
            setSelected({
                id: Date.now().toString(),
                name: e.target.value,
            });
        }
    }, []);
    const handleInputChange = useMemo(() => debounce(onInputChange, 300), [onInputChange]);
    useEffect(() => {
        return () => {
            handleInputChange.cancel();
        };
    }, [handleInputChange]);

    const isShowInitSuggests = !selected?.id;
    const suggestsToShow = isShowInitSuggests ? initSuggests : searchingSuggests;
    return (
        <div
            className={`group relative z-10 flex ${className}`}
            ref={containerRef}
            data-open={showPopover ? "true" : undefined}
        >
            <Headless.Combobox
                value={selected}
                onChange={(value) => {
                    setSelected(value || { id: "", name: "" });
                    if (value?.id) {
                        setShowPopover(false);
                        setTimeout(() => {
                            inputRef.current?.blur();
                        }, 50);
                    }
                }}
            >
                <div
                    onMouseDown={() => setShowPopover(true)}
                    onTouchStart={() => setShowPopover(true)}
                    className={clsx(
                        fieldStyles.button.base,
                        fieldStyles.button[fieldStyle],
                        showPopover && fieldStyles.button.focused,
                    )}
                >
                    {fieldStyle === "default" && (
                        <MapPinIcon className="size-5 text-neutral-300 lg:size-7 dark:text-neutral-400" />
                    )}

                    <div className="grow">
                        <Headless.ComboboxInput
                            ref={inputRef}
                            aria-label="Search for a location"
                            className={clsx(styles.input.base, styles.input[fieldStyle])}
                            name={inputName}
                            placeholder={placeholder}
                            autoComplete="off"
                            displayValue={(item: Suggest | null) => item?.name || ""}
                            onChange={handleInputChange}
                        />
                        <div className="mt-0.5 text-start text-sm font-[350] text-neutral-400">
                            <span className="line-clamp-1">{description}</span>
                        </div>

                        <ClearDataButton
                            className={clsx(!selected?.id && "sr-only")}
                            onClick={() => {
                                setSelected({ id: "", name: "" });
                                setShowPopover(false);
                                inputRef.current?.focus();
                            }}
                        />
                    </div>
                </div>

                <Headless.Transition show={showPopover} unmount={false}>
                    <div className={clsx(styles.panel.base, styles.panel[fieldStyle])}>
                        {isShowInitSuggests && (
                            <p className="mt-2 mb-3 px-4 text-xs/6 font-normal text-neutral-600 sm:mt-0 sm:px-8 dark:text-neutral-400">
                                Suggested locations
                            </p>
                        )}
                        {isShowInitSuggests && <Divider className="opacity-50" />}
                        <Headless.ComboboxOptions static unmount={false}>
                            {suggestsToShow.map((item) => (
                                <Headless.ComboboxOption
                                    key={item.id}
                                    value={item}
                                    className="flex items-center gap-3 p-4 data-focus:bg-neutral-100 sm:gap-4.5 sm:px-8 dark:data-focus:bg-neutral-700"
                                >
                                    <HugeiconsIcon
                                        icon={item.icon || Location01Icon}
                                        className="size-4 text-neutral-400 sm:size-6 dark:text-neutral-500"
                                    />
                                    <span className="block font-medium text-neutral-700 dark:text-neutral-200">{item.name}</span>
                                </Headless.ComboboxOption>
                            ))}
                        </Headless.ComboboxOptions>
                    </div>
                </Headless.Transition>
            </Headless.Combobox>
        </div>
    );
}
