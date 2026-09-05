import * as Headless from "@headlessui/react";
import AppLink, { type AppLinkProps } from "@/lib/nav/link";

export type LinkProps = AppLinkProps;

/**
 * AppLink inside Headless's DataInteractive, so it carries the same
 * data-hover / data-focus / data-active attributes as every other control and
 * closes the enclosing Headless Menu / Popover / Dialog once followed.
 *
 * Kept separate from the bare AppLink on purpose: chrome (menus, drawers) needs
 * the auto-close, plain page links must not pay for the wrapper.
 */
export function Link(props: LinkProps) {
    const closeHeadless = Headless.useClose();

    return (
        <Headless.DataInteractive>
            <AppLink
                {...props}
                onClick={(e) => {
                    props.onClick?.(e);
                    // A handler that cancelled navigation also keeps the surface open.
                    if (e.defaultPrevented) return;
                    // Hash links only move within the page.
                    if (typeof props.href === "string" && props.href.startsWith("#")) return;
                    closeHeadless();
                }}
            />
        </Headless.DataInteractive>
    );
}
