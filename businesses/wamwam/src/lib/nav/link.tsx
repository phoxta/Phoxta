import type { AnchorHTMLAttributes, Ref } from "react";
import { Link as RouterLink } from "react-router-dom";

/**
 * The app's anchor. Internal paths become client-side router links; anything
 * external, a hash, mailto: or tel: stays a plain <a>.
 *
 * The protocol test matters: react-router resolves `to="#"` against the
 * current location and rewrites the emitted href. Several sections and the
 * social icon lists link to "#", so they must bypass the router to keep the
 * attribute the browser receives identical.
 */

/** Everything a Next-style `href` used to accept: string or `{ pathname }`. */
export type Href = string | { pathname?: string | null };

const EXTERNAL_RE = /^(https?:|mailto:|tel:|#)/;

export interface AppLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
    href?: Href;
    replace?: boolean;
    ref?: Ref<HTMLAnchorElement>;
}

export function resolveHref(href: Href | undefined): string {
    if (typeof href === "object" && href !== null) return href.pathname ?? "/";
    return href ?? "/";
}

export function isExternalHref(to: string): boolean {
    return EXTERNAL_RE.test(to);
}

export default function AppLink({ href, replace, ref, ...rest }: AppLinkProps) {
    const to = resolveHref(href);
    if (isExternalHref(to)) {
        return <a ref={ref} href={to} {...rest} />;
    }
    return <RouterLink ref={ref} to={to} replace={replace} {...rest} />;
}
