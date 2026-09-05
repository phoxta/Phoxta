import { HugeiconsIcon } from "@hugeicons/react";
import clsx from "clsx";
import { Fragment } from "react";
import { Link } from "@/components/chrome/link";
import type { ListingType } from "@/types/domain";
import { heroSearchFormTabsData } from "./tabs";

interface HeroSearchForm2Props {
    className?: string;
    initTab?: ListingType;
    showTabs?: boolean;
}

export default function HeroSearchForm2({ className, initTab = "Stays", showTabs = true }: HeroSearchForm2Props) {
    return (
        <div className={clsx("hero-search-form hidden w-full lg:block", className)}>
            {showTabs && (
                <div className="mb-8 flex justify-center space-x-6 sm:space-x-9">
                    {heroSearchFormTabsData.map((tab) => {
                        // The design labels the Stays tab "Homes".
                        const displayName = tab.name === "Stays" ? "Homes" : tab.name;

                        return (
                            <Link
                                key={tab.name}
                                href={tab.href}
                                className={clsx(
                                    "relative flex shrink-0 items-center pb-2 text-sm font-[450] text-white focus-visible:outline-hidden",
                                )}
                            >
                                <HugeiconsIcon icon={tab.icon} className="me-2.5 size-5 sm:size-6" />
                                <span>{displayName}</span>
                                <div
                                    className={clsx(
                                        "absolute inset-x-0 top-full h-0.5 rounded-full bg-white transition-opacity",
                                        initTab === tab.name ? "opacity-100" : "opacity-0",
                                    )}
                                />
                            </Link>
                        );
                    })}
                </div>
            )}
            {heroSearchFormTabsData.map((tab) =>
                tab.name === initTab ? (
                    <Fragment key={tab.name}>
                        <tab.formComponent formStyle={"default"} />
                    </Fragment>
                ) : null,
            )}
        </div>
    );
}
