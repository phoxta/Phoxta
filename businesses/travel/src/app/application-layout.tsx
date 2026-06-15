import Aside from '@/components/aside'
import AsideSidebarNavigation from '@/components/aside-sidebar-navigation'
import FooterQuickNavigation from '@/components/footer-quick-navigation'
import Footer3 from '@/components/footer3'
import Header from '@/components/header/header'
import HeroSearchFormMobile from '@/components/hero-search-form-mobile/hero-search-form-mobile'
import clsx from 'clsx'
import 'rc-slider/assets/index.css'
import React, { ReactNode } from 'react'

interface Props {
  children: ReactNode
  header?: ReactNode
  isStickyHeader?: boolean
  headerClassName?: string
}

const ApplicationLayout: React.FC<Props> = ({ children, header, isStickyHeader, headerClassName }) => {
  return (
    <Aside.Provider>
      {/* Desktop Header - Will be hidden on mobile devices  */}
      <div className={clsx('z-20 hidden lg:block', isStickyHeader ? 'sticky top-0' : 'relative', headerClassName)}>
        {header ? header : <Header hasBorderBottom={false} />}
      </div>
      {/* HeroSearchFormMobile - will display on mobile devices instead of Header-desktop */}
      <div className="sticky top-0 z-20 bg-background shadow-sm lg:hidden">
        <div className="container flex h-20 items-center justify-center">
          <HeroSearchFormMobile />
        </div>
      </div>
      {/*  */}
      {children}
      {/*  */}
      {/* FooterQuickNavigation - Displays on mobile devices and is fixed at the bottom of the screen */}
      <FooterQuickNavigation />
      {/* Chose footer style here!!!! */}
      <Footer3 /> {/* <Footer /> or <Footer2 /> or <Footer3 /> or <Footer4 />*/}
      {/*  */}
      <AsideSidebarNavigation />
    </Aside.Provider>
  )
}

export { ApplicationLayout }
