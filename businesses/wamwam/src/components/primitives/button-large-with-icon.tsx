import { ArrowUpRightIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import type { ReactNode } from "react";
import { Button } from "@/components/primitives/button";

interface ButtonLargeWithIconProps {
    className?: string;
    children?: ReactNode;
    icon?: ReactNode;
    href?: string;
    onClick?: () => void;
}

export default function ButtonLargeWithIcon({
    className,
    children = "Explore more stays",
    icon,
    ...props
}: ButtonLargeWithIconProps) {
    return (
        <Button
            color="white"
            className={clsx("h-14 w-full max-w-3xl cursor-pointer pr-10 font-medium sm:h-15 sm:pr-12", className)}
            {...props}
        >
            {children}
            <div className="absolute right-1.5 flex size-10 items-center justify-center rounded-full bg-zinc-900 text-white sm:size-12">
                {icon ? icon : <ArrowUpRightIcon className="size-4" />}
            </div>
        </Button>
    );
}
