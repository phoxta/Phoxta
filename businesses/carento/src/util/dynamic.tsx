import { lazy, Suspense } from "react";
import type { ComponentType, ReactNode } from "react";

type DynamicOptions = {
    ssr?: boolean;
    loading?: () => ReactNode;
    suspense?: boolean;
};

export default function dynamic<P extends object>(
    importFn: () => Promise<{ default: ComponentType<P> }>,
    options?: DynamicOptions
): ComponentType<P> {
    const Lazy = lazy(importFn);
    const Fallback = options?.loading;

    const DynamicComponent = (props: P) => (
        <Suspense fallback={Fallback ? <>{Fallback()}</> : null}>
            <Lazy {...props} />
        </Suspense>
    );

    DynamicComponent.displayName = "DynamicComponent";
    return DynamicComponent;
}
