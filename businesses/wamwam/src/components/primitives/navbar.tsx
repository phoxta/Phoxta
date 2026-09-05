import * as Headless from "@headlessui/react";
import clsx from "clsx";
import { LayoutGroup, motion } from "motion/react";
import { useId, type ComponentPropsWithoutRef, type ReactNode, type Ref } from "react";
import { Link } from "@/components/chrome/link";
import { TouchTarget } from "./clickable";

export function Navbar({ className, ...props }: ComponentPropsWithoutRef<"nav">) {
    return <nav {...props} className={clsx(className, 'flex flex-1 items-center gap-4 py-2.5')} />;
}

export function NavbarDivider({ className, ...props }: ComponentPropsWithoutRef<"div">) {
    return (
        <div aria-hidden="true" {...props} className={clsx(className, 'h-6 w-px bg-neutral-950/10 dark:bg-white/10')} />
    );
}

export function NavbarSection({ className, ...props }: ComponentPropsWithoutRef<"div">) {
    const id = useId();
    return (
        <LayoutGroup id={id}>
            <div {...props} className={clsx(className, 'flex items-center gap-3')} />
        </LayoutGroup>
    );
}

export function NavbarSpacer({ className, ...props }: ComponentPropsWithoutRef<"div">) {
    return <div aria-hidden="true" {...props} className={clsx(className, '-ml-4 flex-1')} />;
}

interface NavbarItemOwnProps {
    current?: boolean;
    className?: string;
    children: ReactNode;
    ref?: Ref<HTMLAnchorElement | HTMLButtonElement>;
}

type NavbarLinkProps = NavbarItemOwnProps & Omit<ComponentPropsWithoutRef<typeof Link>, "className">;
type NavbarButtonProps = NavbarItemOwnProps & Omit<Headless.ButtonProps, "as" | "className">;
export type NavbarItemProps = NavbarLinkProps | NavbarButtonProps;

/** `href` is the discriminator: with one this is an anchor, without it a button. */
function isLinkProps(props: NavbarItemProps): props is NavbarLinkProps {
    return "href" in props && props.href != null;
}

const ITEM_CLASSES = clsx(
    // Base
    'relative flex min-w-0 items-center gap-3 rounded-lg p-2 text-left text-base/6 font-medium text-neutral-950 sm:text-sm/5',
    // Leading icon/icon-only
    '*:data-[slot=icon]:size-6 *:data-[slot=icon]:shrink-0 *:data-[slot=icon]:fill-neutral-500 sm:*:data-[slot=icon]:size-5',
    // Trailing icon (down chevron or similar)
    '*:not-nth-2:last:data-[slot=icon]:ml-auto *:not-nth-2:last:data-[slot=icon]:size-5 sm:*:not-nth-2:last:data-[slot=icon]:size-4',
    // Avatar
    '*:data-[slot=avatar]:-m-0.5 *:data-[slot=avatar]:size-7 *:data-[slot=avatar]:[--avatar-radius:var(--radius-md)] sm:*:data-[slot=avatar]:size-6',
    // Hover
    'data-hover:bg-neutral-950/5 data-hover:*:data-[slot=icon]:fill-neutral-950',
    // Active
    'data-active:bg-neutral-950/5 data-active:*:data-[slot=icon]:fill-neutral-950',
    // Dark mode
    'dark:text-white dark:*:data-[slot=icon]:fill-neutral-400',
    'dark:data-hover:bg-white/5 dark:data-hover:*:data-[slot=icon]:fill-white',
    'dark:data-active:bg-white/5 dark:data-active:*:data-[slot=icon]:fill-white'
);

function CurrentIndicator() {
    return (
        <motion.span
            layoutId="current-indicator"
            className="absolute inset-x-2 -bottom-2.5 h-0.5 rounded-full bg-neutral-950 dark:bg-white"
        />
    );
}

export function NavbarItem(props: NavbarItemProps) {
    if (isLinkProps(props)) {
        const { current, className, children, ref, ...rest } = props;
        return (
            <span className={clsx(className, 'relative')}>
                {current && <CurrentIndicator />}
                <Link
                    {...rest}
                    className={ITEM_CLASSES}
                    data-current={current ? 'true' : undefined}
                    ref={ref as Ref<HTMLAnchorElement>}
                >
                    <TouchTarget>{children}</TouchTarget>
                </Link>
            </span>
        );
    }

    const { current, className, children, ref, ...rest } = props;
    return (
        <span className={clsx(className, 'relative')}>
            {current && <CurrentIndicator />}
            <Headless.Button
                {...rest}
                className={clsx('cursor-default', ITEM_CLASSES)}
                data-current={current ? 'true' : undefined}
                ref={ref as Ref<HTMLButtonElement>}
            >
                <TouchTarget>{children}</TouchTarget>
            </Headless.Button>
        </span>
    );
}

export function NavbarLabel({ className, ...props }: ComponentPropsWithoutRef<"span">) {
    return <span {...props} className={clsx(className, 'truncate')} />;
}
