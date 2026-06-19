import { createElement, type ComponentType, type ReactNode } from "react";
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
        let node: ReactNode = createElement(Page, { params, searchParams });
        for (let i = layouts.length - 1; i >= 0; i--) {
            node = createElement(layouts[i], { params, searchParams, children: node });
        }
        return node;
    };
}
