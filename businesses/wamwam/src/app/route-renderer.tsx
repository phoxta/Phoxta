import { createElement, Suspense, type ComponentType, type ReactNode } from "react";
import { useParams, useSearchParams } from "react-router-dom";

/**
 * Compose a page with its layout chain (outermost → innermost) into one
 * component the router can render.
 *
 * Pages are code-split and suspend on first visit. The Suspense boundary sits
 * INSIDE the layout chain on purpose: header, nav and footer paint immediately
 * and only the content area waits. The min-height placeholder reserves the
 * viewport so the footer does not jump up and back down while the chunk loads.
 */

export interface RouteProps {
    params: Readonly<Record<string, string | undefined>>;
    searchParams: URLSearchParams;
}

export type PageComponent = ComponentType<RouteProps>;
export type LayoutComponent = ComponentType<RouteProps & { children: ReactNode }>;

function Fallback() {
    return (
        <div style={{ minHeight: "70vh" }} role="status" aria-busy="true">
            <span
                style={{
                    position: "absolute",
                    width: 1,
                    height: 1,
                    padding: 0,
                    margin: -1,
                    overflow: "hidden",
                    clip: "rect(0,0,0,0)",
                    whiteSpace: "nowrap",
                    border: 0,
                }}
            >
                Loading page
            </span>
        </div>
    );
}

export function page(Page: PageComponent, layouts: LayoutComponent[] = []): ComponentType {
    function RouteRenderer() {
        const params = useParams();
        const [searchParams] = useSearchParams();
        const props: RouteProps = { params, searchParams };
        let node: ReactNode = (
            <Suspense fallback={<Fallback />}>
                <Page {...props} />
            </Suspense>
        );
        for (let i = layouts.length - 1; i >= 0; i--) {
            node = createElement(layouts[i], { ...props, children: node });
        }
        return node;
    }
    RouteRenderer.displayName = `Route(${Page.displayName ?? Page.name ?? "Page"})`;
    return RouteRenderer;
}
