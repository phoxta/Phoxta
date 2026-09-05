import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ButtonCircle as ButtonCircleUI, type ButtonCircleProps } from "@/components/primitives/button";

export default function ButtonClose({ className, ...props }: ButtonCircleProps) {
    return (
        <ButtonCircleUI {...props} className={className}>
            <span className="sr-only">close</span>
            <HugeiconsIcon icon={Cancel01Icon} size={20} color="currentColor" strokeWidth={1.5} />
        </ButtonCircleUI>
    );
}
