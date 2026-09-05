import * as Headless from "@headlessui/react";
import {
    Airplane02Icon,
    Car05Icon,
    HotAirBalloonFreeIcons,
    House04Icon,
    Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import clsx from "clsx";
import { Button } from "@/components/primitives/button";
import Logo from "@/components/chrome/logo";
import HeroSearchFormSmall from "@/components/search/desktop/hero-search-form-small";
import type { ListingType } from "@/types/domain";
import AvatarDropdown from "./avatar-dropdown";
import HamburgerBtnMenu from "./hamburger-btn-menu";
import { useHeroSearchHeader } from "./use-hero-search-header";

interface Props {
    hasBorderBottom?: boolean;
    className?: string;
    initSearchFormTab: ListingType;
}

export default function Header2({ className, hasBorderBottom = true, initSearchFormTab = "Stays" }: Props) {
    const { headerInnerRef, showHeroSearch, setShowHeroSearch, locationText, dateText, guestsText } =
        useHeroSearchHeader(initSearchFormTab);

    return (
        <>
            <div
                className={clsx(
                    `fixed inset-0 top-0 z-10 bg-black/30 transition-opacity dark:bg-black/50`,
                    showHeroSearch ? 'visible' : 'pointer-events-none invisible opacity-0'
                )}
            />

            {/* Anchor for the header to avoid jumping when the hero search form is shown */}
            {showHeroSearch && <div id="nc-Header-3-anchor" />}

            <header
                ref={headerInnerRef}
                className={clsx('relative z-20 w-full bg-background', hasBorderBottom && 'border-b border-border', className)}
            >
                <div className="relative flex h-22 px-4 lg:px-8">
                    <div className="flex flex-1 justify-between">
                        {/* Logo (lg+) */}
                        <div className="relative z-11 flex flex-1/2 items-center">
                            <Logo />
                        </div>

                        <div className="mx-auto flex w-full max-w-lg shrink-0 justify-center">
                            {/* BUTTON SHOW HERO SEARCH FORM DESKTOP */}
                            <Headless.Transition show={!showHeroSearch}>
                                <div
                                    className={clsx(
                                        'relative flex cursor-pointer items-center justify-between self-center rounded-full shadow-md-for-card border-border bg-card text-card-foreground transition ease-in-out hover:shadow-lg-for-card',
                                        // Entering styles
                                        'data-enter:duration-300 data-enter:data-closed:-translate-y-5 data-enter:data-closed:opacity-0',
                                        // Leaving styles
                                        'data-leave:duration-100 data-leave:data-closed:opacity-0'
                                    )}
                                    onClick={() => setShowHeroSearch(true)}
                                    onTouchStart={() => setShowHeroSearch(true)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            setShowHeroSearch(true);
                                        }
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    aria-label="Open search"
                                >
                                    <div className="flex items-center text-sm font-[450] whitespace-nowrap">
                                        <div className="px-3">
                                            {initSearchFormTab === 'Stays' && (
                                                <HugeiconsIcon icon={House04Icon} size={28} className="-mt-0.5" />
                                            )}
                                            {initSearchFormTab === 'Cars' && <HugeiconsIcon icon={Car05Icon} size={28} />}
                                            {initSearchFormTab === 'Experiences' && <HugeiconsIcon icon={HotAirBalloonFreeIcons} size={28} />}
                                            {initSearchFormTab === 'Flights' && <HugeiconsIcon icon={Airplane02Icon} size={28} />}
                                        </div>
                                        <div className="block cursor-pointer py-3 pe-4">{locationText}</div>
                                        <div className="h-5 w-px bg-border"></div>
                                        <div className="block cursor-pointer px-4 py-3">{dateText}</div>
                                        {initSearchFormTab !== 'Cars' && <div className="h-5 w-px bg-border"></div>}
                                        {initSearchFormTab !== 'Cars' && <div className="block cursor-pointer px-4 py-3">{guestsText}</div>}
                                    </div>

                                    <div className="ms-auto shrink-0 cursor-pointer pe-2">
                                        <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                            <HugeiconsIcon icon={Search01Icon} size={16} />
                                        </span>
                                    </div>
                                </div>
                            </Headless.Transition>

                            {/* HERO SEARCH FORM - DESKTOP */}
                            <Headless.Transition show={showHeroSearch}>
                                <div
                                    className={clsx(
                                        'absolute inset-x-0 top-0 z-10 transition ease-in-out',
                                        // Entering styles
                                        'data-enter:duration-200 data-enter:data-closed:-translate-y-20 data-enter:data-closed:opacity-0',
                                        // Leaving styles
                                        'data-leave:duration-100 data-leave:data-closed:opacity-0'
                                    )}
                                >
                                    <div className="absolute inset-x-0 right-0 -z-10 h-full bg-background" />
                                    <div className="mx-auto w-full max-w-4xl pb-8">
                                        <HeroSearchFormSmall initTab={initSearchFormTab} />
                                    </div>
                                </div>
                            </Headless.Transition>
                        </div>

                        {/* NAVIGATIONS */}
                        <div className="relative z-10 flex flex-1/2 items-center justify-end gap-x-2.5 sm:gap-x-4">
                            <div className="hidden xl:block">
                                <Button className="sm:text-sm" plain href={'/contact'}>
                                    List your property
                                </Button>
                            </div>

                            <AvatarDropdown />
                            <HamburgerBtnMenu />
                        </div>
                    </div>
                </div>
            </header>
        </>
    );
}
