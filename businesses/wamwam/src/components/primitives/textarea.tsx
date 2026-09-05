import type { Ref, TextareaHTMLAttributes } from "react";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> };

export default function Textarea({ className = "", children, ref, ...args }: TextareaProps) {
    return (
        <textarea
            ref={ref}
            className={`block w-full rounded-2xl border border-input bg-card px-4 py-3 ${className}`}
            rows={4}
            {...args}
        >
            {children}
        </textarea>
    );
}
