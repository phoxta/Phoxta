import { MinusIcon, PlusIcon } from "@heroicons/react/24/solid";
import { useEffect, useState } from "react";
import ButtonCircle from "@/components/primitives/button-circle";
import { Description, Field, Label } from "@/components/primitives/fieldset";

interface NcInputNumberProps {
    className?: string;
    defaultValue?: number;
    min?: number;
    max?: number;
    onChange?: (value: number) => void;
    label?: string;
    description?: string;
    inputName?: string;
    inputId?: string;
}

export default function NcInputNumber({
    className = "w-full",
    defaultValue = 0,
    min = 0,
    max,
    onChange,
    label,
    description,
    inputName = "guest-number",
    inputId,
}: NcInputNumberProps) {
    const [value, setValue] = useState(defaultValue);

    // Parents re-seed defaultValue (e.g. a clear action); mirror it into the local count.
    useEffect(() => {
        setValue(defaultValue);
    }, [defaultValue]);

    const handleClickDecrement = () => {
        if (min >= value) return;
        setValue((state) => state - 1);
        onChange?.(value - 1);
    };
    const handleClickIncrement = () => {
        // A `max` of 0 has always meant no cap; keep the truthiness test.
        if (max && max <= value) return;
        setValue((state) => state + 1);
        onChange?.(value + 1);
    };

    return (
        <Field className={`flex items-center justify-between gap-x-5 ${className}`}>
            {label && (
                <div className="flex flex-col text-sm sm:text-base">
                    <Label className="font-medium text-neutral-800 dark:text-neutral-200">{label}</Label>
                    {description && (
                        <Description className="text-xs font-normal text-neutral-500 dark:text-neutral-400">
                            {description}
                        </Description>
                    )}
                </div>
            )}

            <div className="flex min-w-32 items-center justify-between gap-2.5">
                <ButtonCircle outline disabled={min >= value} onClick={handleClickDecrement} className="size-8!">
                    <MinusIcon className="size-4!" />
                </ButtonCircle>
                <span>{value || "0"}</span>
                <input type="hidden" name={inputName} id={inputId} value={value || 0} />
                <ButtonCircle outline onClick={handleClickIncrement} disabled={max ? max <= value : false} className="size-8!">
                    <PlusIcon className="size-4!" />
                </ButtonCircle>
            </div>
        </Field>
    );
}
