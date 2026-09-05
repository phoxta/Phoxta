import { ButtonCircle as ButtonCircleUI, type ButtonProps } from "@/components/primitives/button";

export default function ButtonCircle({ children, ...props }: ButtonProps) {
    return <ButtonCircleUI {...props}>{children}</ButtonCircleUI>;
}
