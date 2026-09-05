import type { InputHTMLAttributes, Ref } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    sizeClass?: string;
    fontClass?: string;
    rounded?: string;
    ref?: Ref<HTMLInputElement>;
}

export default function Input({
    className = "",
    sizeClass = "h-11 px-4 py-3",
    fontClass = "sm:text-sm font-normal",
    rounded = "rounded-full",
    // <input> is a void element; anything passed as children is deliberately swallowed.
    children: _children,
    type = "text",
    ref,
    ...args
}: InputProps) {
    return (
        <input
            ref={ref}
            type={type}
            className={`block w-full border border-input bg-card ${rounded} ${fontClass} ${sizeClass} ${className}`}
            {...args}
        />
    );
}
