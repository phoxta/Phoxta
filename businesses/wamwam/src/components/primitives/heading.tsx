import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
type HeadingTag = `h${HeadingLevel}`;

type HeadingProps = {
    level?: HeadingLevel;
    fontSize?: string;
    bigger?: boolean;
} & ComponentProps<HeadingTag>;

export function Heading({
    className,
    fontSize = "text-3xl sm:text-[2rem]/[1.15] xl:text-[2.5rem]/[1.15]",
    bigger = false,
    level = 2,
    ...props
}: HeadingProps) {
    const Element: HeadingTag = `h${level}`;

    return (
        <Element
            {...props}
            className={clsx(
                className,
                bigger ? "text-3xl leading-none sm:text-4xl xl:text-5xl/none" : fontSize,
                "font-medium tracking-[-1%] text-pretty *:data-[slot=dim]:text-zinc-300 *:data-[slot=italic]:font-serif *:data-[slot=italic]:font-normal *:data-[slot=italic]:italic *:data-[slot=dim]:dark:text-zinc-500",
            )}
        />
    );
}

export function Subheading({ className = "", fontSize = "text-lg", level = 3, ...props }: HeadingProps) {
    const Element: HeadingTag = `h${level}`;

    return (
        <Element
            {...props}
            className={clsx(
                "max-w-xl *:data-[slot=dim]:text-zinc-300 *:data-[slot=italic]:font-serif *:data-[slot=italic]:font-normal *:data-[slot=italic]:italic *:data-[slot=dim]:dark:text-zinc-500",
                className,
                fontSize,
            )}
        />
    );
}

type HeadingWithSubProps = HeadingProps & {
    subheading?: string;
    children: ReactNode;
    isCenter?: boolean;
};

export function HeadingWithSub({ className, level = 2, subheading, children, isCenter, ...props }: HeadingWithSubProps) {
    return (
        <div className={clsx(className, "relative mb-12 max-w-2xl", isCenter && "mx-auto w-full text-center text-pretty")}>
            <Heading level={level} {...props}>
                {children}
            </Heading>
            {subheading && <Subheading className="mt-2.5">{subheading}</Subheading>}
        </div>
    );
}
