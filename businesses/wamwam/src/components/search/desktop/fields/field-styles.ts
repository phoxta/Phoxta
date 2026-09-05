/**
 * The trigger pill and its main label, shared by every desktop search field.
 * Each field keeps its own `panel` classes: the dropdowns differ in width,
 * anchoring and z-index, only the pill they hang off is common.
 */
export type FieldStyle = "default" | "small";

export const fieldStyles = {
    button: {
        base: "relative z-10 shrink-0 w-full cursor-pointer flex items-center gap-x-3 focus:outline-hidden text-start",
        focused: "rounded-full bg-transparent focus-visible:outline-hidden dark:bg-white/5 custom-shadow-1",
        default: "px-7 py-4 xl:px-8 xl:py-5",
        small: "py-3 px-7 xl:px-8",
    },
    mainText: {
        default: "text-base xl:text-lg",
        small: "text-base",
    },
} as const;
