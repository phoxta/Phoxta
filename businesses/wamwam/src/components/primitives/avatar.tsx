import clsx from "clsx";
import type { ComponentProps, Ref } from "react";
import { Clickable, type ClickableProps } from "@/components/primitives/clickable";

type AvatarProps = {
    src?: string | null;
    square?: boolean;
    initials?: string;
    alt?: string;
    className?: string;
};

export default function Avatar({
    src = null,
    square = false,
    initials,
    alt = "",
    className,
    ...props
}: AvatarProps & ComponentProps<"span">) {
    return (
        <span
            data-slot="avatar"
            {...props}
            className={clsx(
                className,
                // Basic layout
                "inline-grid shrink-0 align-middle [--avatar-radius:20%] *:col-start-1 *:row-start-1",
                "outline -outline-offset-1 outline-black/10 dark:outline-white/10",
                // Border radius
                square ? "rounded-(--avatar-radius) *:rounded-(--avatar-radius)" : "rounded-full *:rounded-full",
            )}
        >
            {initials && (
                <svg
                    className="size-full fill-current p-[5%] text-[48px] font-medium uppercase select-none"
                    viewBox="0 0 100 100"
                    aria-hidden={alt ? undefined : "true"}
                >
                    {alt && <title>{alt}</title>}
                    <text x="50%" y="50%" alignmentBaseline="middle" dominantBaseline="middle" textAnchor="middle" dy=".125em">
                        {initials}
                    </text>
                </svg>
            )}
            {src && <img className="size-full" src={src} alt={alt} />}
        </span>
    );
}

export function AvatarButton({
    src,
    square = false,
    initials,
    alt,
    className,
    ...props
}: AvatarProps & { ref?: Ref<HTMLElement> } & ClickableProps) {
    const classes = clsx(
        className,
        square ? "rounded-[20%]" : "rounded-full",
        "relative inline-grid focus:not-data-focus:outline-hidden data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-blue-500",
    );

    return (
        <Clickable {...props} className={classes}>
            <Avatar src={src} square={square} initials={initials} alt={alt} />
        </Clickable>
    );
}
