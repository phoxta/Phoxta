import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import clsx from "clsx";
import type { FieldStyle } from "./field-styles";

const styles = {
    base: "absolute z-10 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full bg-neutral-900 dark:bg-neutral-100 text-neutral-50 dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 focus:outline-hidden cursor-pointer",
    default: "size-16 end-2 xl:end-3",
    small: "size-14 end-2",
};

interface ButtonSubmitProps {
    className?: string;
    fieldStyle?: FieldStyle;
}

export function ButtonSubmit({ className, fieldStyle = "default" }: ButtonSubmitProps) {
    return (
        <button type="submit" aria-label="Search" className={clsx(styles.base, styles[fieldStyle], className)}>
            <HugeiconsIcon icon={Search01Icon} size={24} />
        </button>
    );
}
