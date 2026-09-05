import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import clsx from "clsx";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import Logo from "@/components/chrome/logo";

/** The drawers this app can open. One provider owns which (if any) is showing. */
export type AsideType = "closed" | "sidebar-navigation";

interface AsideContextValue {
    type: AsideType;
    open: (mode: AsideType) => void;
    close: () => void;
}

const AsideContext = createContext<AsideContextValue | null>(null);

export function AsideProvider({ children }: { children: ReactNode }) {
    const [type, setType] = useState<AsideType>("closed");
    const value = useMemo<AsideContextValue>(
        () => ({ type, open: setType, close: () => setType("closed") }),
        [type],
    );
    return <AsideContext.Provider value={value}>{children}</AsideContext.Provider>;
}

export function useAside(): AsideContextValue {
    const aside = useContext(AsideContext);
    if (!aside) throw new Error("useAside must be used within an AsideProvider");
    return aside;
}

interface AsideProps {
    /** Shown at the top of the drawer; ignored when logoOnHeading is set. */
    heading?: string;
    logoOnHeading?: boolean;
    openFrom: "right" | "left";
    children: ReactNode;
    /** Which drawer this is — it shows while the provider's type matches. */
    type: AsideType;
    contentMaxWidthClassName?: string;
    showHeading?: boolean;
}

/** A slide-over drawer, shown while the provider's active type matches `type`. */
export function Aside({
    heading,
    logoOnHeading = false,
    openFrom = "right",
    children,
    type,
    contentMaxWidthClassName = "max-w-lg",
    showHeading = true,
}: AsideProps) {
    const { type: activeType, close } = useAside();
    const open = type === activeType;
    const hasHeading = !!heading || logoOnHeading;

    return (
        <Dialog as="div" className="relative z-50" onClose={close} open={open}>
            <DialogBackdrop
                transition
                className="fixed inset-0 bg-neutral-900/50 duration-300 ease-out data-closed:opacity-0"
            />

            <div className="fixed inset-0">
                <div className="absolute inset-0 overflow-hidden">
                    <div className={clsx('fixed inset-y-0 flex max-w-full', openFrom === 'right' && 'right-0')}>
                        <DialogPanel
                            transition
                            className={clsx(
                                contentMaxWidthClassName,
                                'h-screen w-screen translate-x-0 overflow-hidden bg-background text-start align-middle shadow-xl transition duration-200 ease-in-out dark:bg-neutral-800',
                                openFrom === 'left' && 'data-closed:-translate-x-20 data-closed:opacity-0',
                                openFrom === 'right' && 'data-closed:translate-x-20 data-closed:opacity-0'
                            )}
                        >
                            <div className="flex h-full flex-col px-4 md:px-8">
                                {showHeading ? (
                                    <header
                                        className={`flex h-16 shrink-0 items-center border-b border-border md:h-20 ${
                                            hasHeading ? 'justify-between' : 'justify-end'
                                        }`}
                                    >
                                        {hasHeading && (
                                            <>
                                                {!!heading && !logoOnHeading && (
                                                    <DialogTitle>
                                                        <span className="text-2xl font-medium">{heading}</span>
                                                    </DialogTitle>
                                                )}
                                                {logoOnHeading && <Logo />}
                                            </>
                                        )}

                                        <button
                                            type="button"
                                            className="group -m-4 cursor-pointer p-4"
                                            onClick={close}
                                            aria-label="Close menu"
                                        >
                                            <HugeiconsIcon
                                                className="transition-transform duration-200 group-hover:rotate-90"
                                                icon={Cancel01Icon}
                                                size={24}
                                                strokeWidth={1}
                                            />
                                        </button>
                                    </header>
                                ) : null}
                                <div className="flex-1 overflow-hidden">{children}</div>
                            </div>
                        </DialogPanel>
                    </div>
                </div>
            </div>
        </Dialog>
    );
}
