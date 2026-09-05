import { XMarkIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";

interface ClearDataButtonProps {
    onClick?: () => void;
    className?: string;
}

/** Stays a <span>: it sits inside a Headless PopoverButton/Combobox pill, where a nested <button> would be invalid. */
export function ClearDataButton({ onClick, className }: ClearDataButtonProps) {
    return (
        <span
            onClick={onClick}
            className={clsx(
                "invisible absolute end-2.5 top-1/2 z-10 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-transparent transition duration-100 group-data-open:visible hover:bg-neutral-100 dark:hover:bg-neutral-800",
                className,
            )}
        >
            <XMarkIcon className="size-4.5" />
        </span>
    );
}
