import type { ReactNode } from "react";
import { Description, Field, Label } from "@/components/primitives/fieldset";

interface FormItemProps {
    className?: string;
    label?: string;
    /** Misspelt in the original template; kept so every call site ports verbatim. */
    desccription?: string;
    children?: ReactNode;
}

export default function FormItem({ children, className = "", label, desccription }: FormItemProps) {
    return (
        <Field className={className}>
            {label && <Label>{label}</Label>}
            <div className="mt-1.5">{children}</div>
            {desccription && <Description className="mt-2 block text-sm">{desccription}</Description>}
        </Field>
    );
}
