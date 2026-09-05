import * as Headless from "@headlessui/react";
import clsx from "clsx";
import { useState } from "react";
import QueryForm from "@/lib/nav/form";
import { useRouter } from "@/lib/nav/navigation";
import { ButtonSubmit, DateRangeField, LocationInputField, VerticalDividerLine } from "./fields";
import type { FieldStyle } from "./fields/field-styles";

type DropOffLocationType = "same" | "different";

interface RentalCarSearchFormProps {
    className?: string;
    formStyle?: FieldStyle;
}

export function RentalCarSearchForm({ className, formStyle = "default" }: RentalCarSearchFormProps) {
    const [dropOffLocationType, setDropOffLocationType] = useState<DropOffLocationType>("different");

    const router = useRouter();

    const handleFormSubmit = (formData: FormData) => {
        const location = formData.get("pickup-location");
        let url = "/car-search";
        if (typeof location === "string" && location) {
            url = url + `?location=${encodeURIComponent(location)}`;
        }
        router.push(url);
    };

    const isDropOffDifferent = dropOffLocationType === "different";
    return (
        <QueryForm
            className={clsx(
                "relative z-10 w-full shadow-lg-for-card bg-white [--form-bg:var(--color-white)] dark:bg-neutral-800 dark:[--form-bg:var(--color-neutral-800)]",
                className,
                formStyle === "small" && "rounded-t-2xl rounded-b-4xl",
                formStyle === "default" && "rounded-t-2xl rounded-b-[40px] xl:rounded-t-3xl xl:rounded-b-[48px]",
            )}
            action={handleFormSubmit}
        >
            {/* RADIO */}
            <Headless.RadioGroup
                value={dropOffLocationType}
                onChange={setDropOffLocationType}
                aria-label="Drop Off Location Type"
                name="drop_off_location_type"
                className={clsx(
                    "flex flex-wrap items-center gap-2.5 border-b border-neutral-100 dark:border-neutral-700",
                    formStyle === "small" && "px-7 py-4 xl:px-8",
                    formStyle === "default" && "px-7 py-4 xl:px-8 xl:py-6",
                )}
            >
                <Headless.Radio
                    value="different"
                    className={`flex cursor-pointer items-center rounded-full border border-neutral-300 px-4 py-1.5 text-xs font-medium dark:border-neutral-700 data-checked:bg-black data-checked:text-white data-checked:shadow-lg data-checked:shadow-black/10 dark:data-checked:bg-neutral-200 dark:data-checked:text-neutral-900`}
                >
                    Different drop off
                </Headless.Radio>
                <Headless.Radio
                    value="same"
                    className={`flex cursor-pointer items-center rounded-full border border-neutral-300 px-4 py-1.5 text-xs font-medium dark:border-neutral-700 data-checked:bg-black data-checked:text-white data-checked:shadow-lg data-checked:shadow-black/10 dark:data-checked:bg-neutral-200 dark:data-checked:text-neutral-900`}
                >
                    Same drop off
                </Headless.Radio>
            </Headless.RadioGroup>

            <div className="relative flex">
                <LocationInputField
                    placeholder={"City or Airport"}
                    description={"Pick up location"}
                    className="hero-search-form__field-after flex-1"
                    inputName="pickup-location"
                    fieldStyle={formStyle}
                />
                {isDropOffDifferent && (
                    <>
                        <VerticalDividerLine />
                        <LocationInputField
                            placeholder={"City or Airport"}
                            description={"Drop off location"}
                            className="hero-search-form__field-before hero-search-form__field-after flex-1"
                            inputName="dropoff-location"
                            fieldStyle={formStyle}
                        />
                    </>
                )}
                <VerticalDividerLine />
                <DateRangeField
                    className="hero-search-form__field-before flex-1"
                    description={"Pick up - Drop off"}
                    clearDataButtonClassName={clsx(formStyle === "small" && "sm:end-18", formStyle === "default" && "sm:end-22")}
                    fieldStyle={formStyle}
                />

                <ButtonSubmit fieldStyle={formStyle} />
            </div>
        </QueryForm>
    );
}
