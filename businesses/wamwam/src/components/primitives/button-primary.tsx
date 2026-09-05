import { Button, type ButtonProps } from "@/components/primitives/button";

/** Always the dark/white solid — a caller's own color/outline/plain is dropped, as it always was. */
export default function ButtonPrimary({ color: _color, outline: _outline, plain: _plain, children, ...props }: ButtonProps) {
    return (
        <Button color="dark/white" {...props}>
            {children}
        </Button>
    );
}
