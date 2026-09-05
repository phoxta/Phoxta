import { Button, type ButtonProps } from "@/components/primitives/button";

/** Always the plain variant — a caller's own color/outline/plain is dropped, as it always was. */
export default function ButtonThird({ color: _color, outline: _outline, plain: _plain, children, ...props }: ButtonProps) {
    return (
        <Button plain {...props}>
            {children}
        </Button>
    );
}
