import * as Headless from "@headlessui/react";
import clsx from "clsx";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { Link } from "@/components/chrome/link";
import type { Href } from "@/lib/nav/link";

/** Anchor branch: the chrome Link's props with `href` mandatory — it is the discriminator. */
export type ClickableLinkProps = Omit<ComponentPropsWithoutRef<typeof Link>, "className" | "href"> & { href: Href };
/** Button branch: a Headless button rendered as a native <button>. */
export type ClickableButtonProps = Omit<Headless.ButtonProps, "as" | "className">;
export type ClickableProps = ClickableLinkProps | ClickableButtonProps;

export function isLinkProps(props: ClickableProps): props is ClickableLinkProps {
    return "href" in props && props.href != null;
}

export interface ClickableOwnProps {
    className?: string;
    /** Appended on the button branch only: Button wants `cursor-default` there, Avatar/Badge do not. */
    buttonClassName?: string;
    ref?: Ref<HTMLElement>;
    children: ReactNode;
}

const OWN_KEYS = ["className", "buttonClassName", "ref", "children"] as const;

/** Everything except our own props — what gets spread onto the rendered element. */
function elementProps<T extends object>(props: T): Omit<T, (typeof OWN_KEYS)[number]> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(props)) {
        if (!(OWN_KEYS as readonly string[]).includes(k)) out[k] = v;
    }
    return out as Omit<T, (typeof OWN_KEYS)[number]>;
}

/**
 * The href-vs-button fork that Button, ButtonCircle, AvatarButton and
 * BadgeButton each used to inline. With an `href` it renders the chrome Link
 * (DataInteractive state + menu auto-close); otherwise a Headless.Button. Both
 * branches wrap the content in TouchTarget.
 *
 * The branch is decided on the full props object so the type predicate
 * narrows cleanly; TS cannot distribute a predicate over a rest-destructured
 * intersection, which is why this is not written as `({ ...props })`.
 */
export function Clickable(props: ClickableOwnProps & ClickableProps) {
    const { className, buttonClassName, ref, children } = props;
    if (isLinkProps(props)) {
        return (
            <Link {...elementProps(props)} className={className} ref={ref as Ref<HTMLAnchorElement> | undefined}>
                <TouchTarget>{children}</TouchTarget>
            </Link>
        );
    }
    const buttonProps = elementProps(props as ClickableOwnProps & ClickableButtonProps);
    return (
        <Headless.Button
            {...buttonProps}
            className={clsx(className, buttonClassName)}
            ref={ref as Ref<HTMLButtonElement> | undefined}
        >
            <TouchTarget>{children}</TouchTarget>
        </Headless.Button>
    );
}

/** Expand the hit area to at least 44×44px on touch devices. */
export function TouchTarget({ children }: { children: ReactNode }) {
    return (
        <>
            <span
                className="absolute top-1/2 left-1/2 size-[max(100%,2.75rem)] -translate-x-1/2 -translate-y-1/2 [@media(pointer:fine)]:hidden"
                aria-hidden="true"
            />
            {children}
        </>
    );
}
