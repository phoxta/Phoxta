import * as Headless from "@headlessui/react";
import clsx from "clsx";
import type { ReactNode } from "react";

interface FieldPanelContainerProps {
    className?: string;
    children: ReactNode;
    isActive: boolean;
    headingOnClick: () => void;
    headingTitle: string;
    headingValue: string;
}

/**
 * One collapsible step of the mobile search: a summary row when inactive, the
 * field itself when active. The field stays mounted while collapsed
 * (`unmount={false}`) so its inputs are still in the form on submit.
 */
export default function FieldPanelContainer({
    className,
    children,
    isActive,
    headingOnClick,
    headingTitle,
    headingValue,
}: FieldPanelContainerProps) {
    return (
        <div className={clsx("w-full rounded-xl bg-white p-4 shadow-xs dark:bg-neutral-800", className)}>
            <Headless.Transition show={!isActive}>
                <button type="button" className="flex w-full gap-x-5 text-sm font-medium" onClick={headingOnClick}>
                    <p className="shrink-0 text-neutral-400">{headingTitle}</p>
                    <div className="flex w-full justify-end">
                        <span className="line-clamp-1">{headingValue}</span>
                    </div>
                </button>
            </Headless.Transition>
            <Headless.Transition unmount={false} show={isActive} as="div">
                {children}
            </Headless.Transition>
        </div>
    );
}
