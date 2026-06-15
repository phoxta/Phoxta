import { forwardRef } from "react";
import type { AnchorHTMLAttributes, MouseEvent } from "react";
import { Link as RouterLink } from "react-router-dom";

type NextLinkLikeProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    href: string | { pathname?: string; search?: string; hash?: string } | null | undefined;
    replace?: boolean;
    scroll?: boolean;
    prefetch?: boolean;
    shallow?: boolean;
    locale?: string | false;
    passHref?: boolean;
    legacyBehavior?: boolean;
};

function isExternal(href: string): boolean {
    return /^(https?:)?\/\//i.test(href) || href.startsWith("//");
}

function isNonNav(href: string): boolean {
    return (
        href === "" ||
        href === "#" ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:")
    );
}

function normalizeHref(href: NextLinkLikeProps["href"]): string {
    if (!href) return "#";
    if (typeof href === "string") return href;
    const { pathname = "", search = "", hash = "" } = href;
    return `${pathname}${search}${hash}` || "#";
}

const Link = forwardRef<HTMLAnchorElement, NextLinkLikeProps>(function Link(
    {
        href,
        replace,
        scroll: _scroll,
        prefetch: _prefetch,
        shallow: _shallow,
        locale: _locale,
        passHref: _passHref,
        legacyBehavior: _legacyBehavior,
        children,
        onClick,
        ...rest
    },
    ref
) {
    const url = normalizeHref(href);

    if (isNonNav(url) || isExternal(url)) {
        return (
            <a
                ref={ref}
                href={url}
                onClick={(e: MouseEvent<HTMLAnchorElement>) => {
                    if (onClick) onClick(e);
                }}
                {...rest}
            >
                {children}
            </a>
        );
    }

    return (
        <RouterLink
            ref={ref}
            to={url}
            replace={replace}
            onClick={onClick as (e: MouseEvent<HTMLAnchorElement>) => void}
            {...rest}
        >
            {children}
        </RouterLink>
    );
});

export default Link;
