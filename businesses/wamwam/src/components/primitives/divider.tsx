import clsx from "clsx";
import type { ComponentPropsWithoutRef } from "react";

type DividerProps = { soft?: boolean } & ComponentPropsWithoutRef<"hr">;

export function Divider({ soft = false, className, ...props }: DividerProps) {
    return (
        <hr
            role="presentation"
            {...props}
            className={clsx(className, "w-full border-t", soft && "border-border/50", !soft && "border-border")}
        />
    );
}
