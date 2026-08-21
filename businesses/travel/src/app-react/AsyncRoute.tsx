import { createElement, Suspense, type ComponentType, type ReactNode } from "react";
import { useParams, useSearchParams } from "react-router-dom";

// The template's pages/layouts are now synchronous components. This composes a
// page with its layout chain (outermost → innermost) into a single React
// component, passing Next-style `params` / `searchParams` props from the router.
// deno-lint-ignore no-explicit-any
type Comp = ComponentType<any>;

export function page(Page: Comp, layouts: Comp[] = []): Comp {
    return function RouteRenderer() {
        const params = useParams();
        const [sp] = useSearchParams();
        const searchParams = Object.fromEntries(sp.entries());
        // The page is code-split (router.tsx lazy-loads them), so it suspends.
        // The boundary sits INSIDE the layout chain deliberately: header, nav and
        // footer render immediately and only the content area waits, instead of
        // the whole screen blanking. The min-height placeholder reserves the
        // viewport so the footer does not jump up and then back down — which is
        // what made scrolling feel like it skipped.
        let node: ReactNode = createElement(
            Suspense,
            { fallback: createElement("div", { style: { minHeight: "70vh" }, "aria-busy": "true" }) },
            createElement(Page, { params, searchParams }),
        );
        for (let i = layouts.length - 1; i >= 0; i--) {
            node = createElement(layouts[i], { params, searchParams, children: node });
        }
        return node;
    };
}
