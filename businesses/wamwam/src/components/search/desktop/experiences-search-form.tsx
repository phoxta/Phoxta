import clsx from "clsx";
import QueryForm from "@/lib/nav/form";
import { useRouter } from "@/lib/nav/navigation";
import { ButtonSubmit, DateRangeField, GuestNumberField, LocationInputField, VerticalDividerLine } from "./fields";
import type { FieldStyle } from "./fields/field-styles";

export interface DestinationSearchFormProps {
    className?: string;
    formStyle?: FieldStyle;
}

interface DestinationSearchFormBaseProps extends DestinationSearchFormProps {
    /** Results page the submit navigates to; `?location=` is appended when one was typed. */
    searchPath: string;
    /** Sub-label under the dates. Undefined keeps DateRangeField's own default. */
    dateDescription?: string;
}

/**
 * Location + dates + guests in one pill. The experiences and stays forms were
 * byte-identical apart from the results URL and the date sub-label, so both
 * are this component with different parameters.
 */
export function DestinationSearchForm({
    className,
    formStyle = "default",
    searchPath,
    dateDescription,
}: DestinationSearchFormBaseProps) {
    const router = useRouter();

    const handleFormSubmit = (formData: FormData) => {
        const location = formData.get("location");
        let url = searchPath;
        if (typeof location === "string" && location) {
            url = url + `?location=${encodeURIComponent(location)}`;
        }
        router.push(url);
    };

    return (
        <QueryForm
            className={clsx(
                "relative z-10 flex w-full rounded-full shadow-lg-for-card bg-white [--form-bg:var(--color-white)] dark:bg-neutral-800 dark:[--form-bg:var(--color-neutral-800)]",
                className,
            )}
            action={handleFormSubmit}
        >
            <LocationInputField className="hero-search-form__field-after flex-5/12" fieldStyle={formStyle} />
            <VerticalDividerLine />
            <DateRangeField
                className="hero-search-form__field-before hero-search-form__field-after flex-4/12"
                fieldStyle={formStyle}
                description={dateDescription}
            />
            <VerticalDividerLine />
            <GuestNumberField
                className="hero-search-form__field-before flex-4/12"
                clearDataButtonClassName={clsx(formStyle === "small" && "sm:end-18", formStyle === "default" && "sm:end-22")}
                fieldStyle={formStyle}
            />

            <ButtonSubmit fieldStyle={formStyle} className="z-10" />
        </QueryForm>
    );
}

export function ExperiencesSearchForm(props: DestinationSearchFormProps) {
    return <DestinationSearchForm {...props} searchPath="/experience-search" dateDescription={"Date range"} />;
}
