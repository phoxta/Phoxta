import clsx from "clsx";
import type { ComponentPropsWithoutRef } from "react";
import { Link } from "@/components/chrome/link";

export function Text({ className, ...props }: ComponentPropsWithoutRef<"p">) {
    return <p data-slot="text" {...props} className={clsx(className, "text-base/6")} />;
}

export function TextLink({ className, ...props }: ComponentPropsWithoutRef<typeof Link>) {
    return <Link {...props} className={clsx(className, "text-base/6")} />;
}

export function Strong({ className, ...props }: ComponentPropsWithoutRef<"strong">) {
    return <strong {...props} className={clsx(className, "text-base/6 font-medium")} />;
}

export function Code({ className, ...props }: ComponentPropsWithoutRef<"code">) {
    return (
        <code
            {...props}
            className={clsx(
                className,
                "rounded-sm border border-zinc-950/10 bg-zinc-950/[2.5%] px-0.5 text-sm font-medium text-zinc-950 sm:text-[0.8125rem] dark:border-white/20 dark:bg-white/5 dark:text-white",
            )}
        />
    );
}
