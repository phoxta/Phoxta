import { Link } from "react-router-dom";
import type { AnchorHTMLAttributes, ReactNode } from "react";

// Bridges the template's `*.html` hrefs to react-router routes: "shop-default.html"
// → "/shop-default", "index.html" → "/". External / mail / tel / "#" stay anchors.
type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { to?: string; children?: ReactNode };

export default function RLink({ to = "#", children, ...rest }: Props) {
    if (to === "#" || to === "") {
        return (
            <a href="#" {...rest} onClick={(e) => { e.preventDefault(); rest.onClick?.(e); }}>
                {children}
            </a>
        );
    }
    if (/^(https?:|mailto:|tel:)/.test(to)) {
        return <a href={to} {...rest}>{children}</a>;
    }
    let path = to.replace(/\.html$/, "");
    if (path === "index" || path === "") path = "/";
    if (!path.startsWith("/")) path = "/" + path;
    return <Link to={path} {...rest}>{children}</Link>;
}
