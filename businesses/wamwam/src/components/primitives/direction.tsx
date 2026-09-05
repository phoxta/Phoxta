import type { ComponentProps } from "react";
import { Direction } from "radix-ui";

type Dir = ComponentProps<typeof Direction.DirectionProvider>["dir"];

export function DirectionProvider({
    dir,
    direction,
    children,
}: ComponentProps<typeof Direction.DirectionProvider> & { direction?: Dir }) {
    return <Direction.DirectionProvider dir={direction ?? dir}>{children}</Direction.DirectionProvider>;
}

export const useDirection = Direction.useDirection;
