import clsx from "clsx";
import type { ReactNode } from "react";
import "rc-slider/assets/index.css";
import Aside from "@/components/chrome/aside";
import AsideSidebarNavigation from "@/components/chrome/aside/aside-sidebar-navigation";
import FooterQuickNavigation from "@/components/chrome/footer-quick-navigation";
import Footer3 from "@/components/chrome/footer/footer3";
import Header from "@/components/chrome/header/header";
import HeroSearchFormMobile from "@/components/search/mobile/hero-search-form-mobile";

interface Props {
    children: ReactNode;
    header?: ReactNode;
    isStickyHeader?: boolean;
    headerClassName?: string;
}

/**
 * The page shell every route renders inside: desktop header (or a per-route
 * override), the mobile hero search bar, the page, then the mobile quick-nav
 * and footer.
 *
 * Child order is load-bearing — the live-edit overlay addresses headings,
 * paragraphs and images by document-order index.
 */
export function ApplicationLayout({ children, header, isStickyHeader, headerClassName }: Props) {
    return (
        <Aside.Provider>
            {/* Desktop header — hidden on mobile */}
            <div className={clsx('z-20 hidden lg:block', isStickyHeader ? 'sticky top-0' : 'relative', headerClassName)}>
                {header ? header : <Header hasBorderBottom={false} />}
            </div>

            {/* Mobile shows the hero search bar in place of the desktop header */}
            <div className="sticky top-0 z-20 bg-background shadow-sm lg:hidden">
                <div className="container flex h-20 items-center justify-center">
                    <HeroSearchFormMobile />
                </div>
            </div>

            {children}

            <FooterQuickNavigation />
            <Footer3 />
            <AsideSidebarNavigation />
        </Aside.Provider>
    );
}

export default ApplicationLayout;
