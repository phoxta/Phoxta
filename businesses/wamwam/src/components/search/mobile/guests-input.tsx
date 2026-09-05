import clsx from "clsx";
import NcInputNumber from "@/components/primitives/nc-input-number";
import type { GuestsObject } from "@/types/domain";

interface GuestsInputProps {
    defaultValue?: GuestsObject;
    onChange?: (data: GuestsObject) => void;
    className?: string;
}

/** Controlled by the parent: values arrive as `defaultValue` and leave through `onChange`; nothing is mirrored here. */
export default function GuestsInput({ defaultValue, onChange, className }: GuestsInputProps) {
    const guestAdultsInputValue = defaultValue?.guestAdults || 0;
    const guestChildrenInputValue = defaultValue?.guestChildren || 0;
    const guestInfantsInputValue = defaultValue?.guestInfants || 0;

    const handleChangeData = (value: number, type: keyof GuestsObject) => {
        onChange?.({
            guestAdults: guestAdultsInputValue,
            guestChildren: guestChildrenInputValue,
            guestInfants: guestInfantsInputValue,
            [type]: value,
        });
    };

    return (
        <div className={clsx(`relative flex flex-col`, className)}>
            <h3 className="mb-5 block text-xl font-semibold sm:text-2xl">Who&lsquo;s coming?</h3>
            <NcInputNumber
                className="w-full"
                defaultValue={guestAdultsInputValue}
                onChange={(value) => handleChangeData(value, "guestAdults")}
                max={20}
                label="Adults"
                description="Ages 13 or above"
                inputName="guestAdults"
            />
            <NcInputNumber
                className="mt-6 w-full"
                defaultValue={guestChildrenInputValue}
                onChange={(value) => handleChangeData(value, "guestChildren")}
                max={20}
                label="Children"
                description="Ages 2–12"
                inputName="guestChildren"
            />

            <NcInputNumber
                className="mt-6 w-full"
                defaultValue={guestInfantsInputValue}
                onChange={(value) => handleChangeData(value, "guestInfants")}
                max={20}
                label="Infants"
                description="Ages 0–2"
                inputName="guestInfants"
            />
        </div>
    );
}
