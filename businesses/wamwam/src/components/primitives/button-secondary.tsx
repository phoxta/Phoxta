import { Button, type ButtonProps } from "@/components/primitives/button";

/** Always the light solid — a caller's own color/outline/plain is dropped, as it always was. */
export default function ButtonSecondary({ color: _color, outline: _outline, plain: _plain, children, ...props }: ButtonProps) {
    return (
        <Button color="light" {...props}>
            {children}
        </Button>
    );
}
