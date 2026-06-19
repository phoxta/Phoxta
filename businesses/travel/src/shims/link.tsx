import { forwardRef } from "react";
import { Link as RouterLink } from "react-router-dom";

// next/link shim → react-router Link. External / hash / mailto / tel stay anchors.
// deno-lint-ignore no-explicit-any
type Props = any;

const Link = forwardRef<HTMLAnchorElement, Props>(function Link(
    { href, replace, scroll, prefetch, locale, shallow, passHref, legacyBehavior, ...rest },
    ref,
) {
    const to = typeof href === "object" && href ? (href.pathname ?? "/") : (href ?? "/");
    if (typeof to === "string" && /^(https?:|mailto:|tel:|#)/.test(to)) {
        return <a ref={ref} href={to} {...rest} />;
    }
    return <RouterLink ref={ref} to={to} replace={replace} {...rest} />;
});

export default Link;
