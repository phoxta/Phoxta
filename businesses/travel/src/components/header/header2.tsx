'use client'

import { Button } from '@/components/button'
import Logo from '@/components/logo'
import { useInteractOutside } from '@/hooks/use-interact-outside'
import { ListingType } from '@/type'
import * as Headless from '@headlessui/react'
import {
  Airplane02Icon,
  Car05Icon,
  HotAirBalloonFreeIcons,
  House04Icon,
  Search01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import { usePathname } from 'next/navigation'
import { FC, useCallback, useEffect, useRef, useState } from 'react'
import HeroSearchFormSmall from '../hero-search-form/hero-search-form-small'
import AvatarDropdown from './avatar-dropdown'
import HamburgerBtnMenu from './hamburger-btn-menu'

interface Props {
  hasBorderBottom?: boolean
  className?: string
  initSearchFormTab: ListingType
}

const Header2: FC<Props> = ({ className, hasBorderBottom = true, initSearchFormTab = 'Stays' }) => {
  const headerInnerRef = useRef<HTMLDivElement>(null)
  const [showHeroSearch, setShowHeroSearch] = useState<boolean>(false)
  const lastScrollY = useRef<number>(0)
  const rafId = useRef<number | null>(null)

  // pathname
  const pathname = usePathname()

  let locationText = 'Anywhere'
  let dateText = 'Any week'
  let guestsText = 'Add guests'

  if (pathname.startsWith('/experience-search') && initSearchFormTab === 'Experiences') {
    locationText = 'Experiences in Bali'
    dateText = 'Mar 22 - 27'
    guestsText = '2 guests'
  } else if (pathname.startsWith('/car-search') && initSearchFormTab === 'Cars') {
    locationText = 'Car rentals in Tokyo'
    dateText = 'Mar 25 - 28'
  } else if (pathname.startsWith('/flight-search') && initSearchFormTab === 'Flights') {
    locationText = 'Flights to Rome'
    dateText = 'Mar 10 - 15'
    guestsText = '1 guest'
  } else if (pathname.startsWith('/stay-search') && initSearchFormTab === 'Stays') {
    locationText = 'Homes in London'
    dateText = 'Mar 20 - 25'
    guestsText = '1 guest'
  }

  // for memoization of the close function
  const closeHeroSearch = useCallback(() => {
    setShowHeroSearch(false)
  }, [])

  // HIDE HERO SEARCH FORM WHEN CLICK OUTSIDE
  useInteractOutside(headerInnerRef, closeHeroSearch)

  useEffect(() => {
    // update the lastScrollY position when the hero search is shown/hidden
    lastScrollY.current = window.pageYOffset
  }, [showHeroSearch])

  const handleHideSearchForm = useCallback(() => {
    if (!document.querySelector('#nc-Header-3-anchor')) {
      return
    }
    const currentScrollY = window.pageYOffset
    const scrollDifference = Math.abs(lastScrollY.current - currentScrollY)
    if (scrollDifference > 150) {
      setShowHeroSearch(false)
      lastScrollY.current = currentScrollY
    }
  }, [])

  const handleEventScroll = useCallback(() => {
    rafId.current = window.requestAnimationFrame(handleHideSearchForm)
  }, [handleHideSearchForm])

  // HIDDEN WHEN SCROLL EVENT
  useEffect(() => {
    window.addEventListener('scroll', handleEventScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleEventScroll)
      // Cleanup requestAnimationFrame if pending
      if (rafId.current) {
        window.cancelAnimationFrame(rafId.current)
      }
    }
  }, [handleEventScroll])

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

      {/* The header here */}
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
                  role="button"
                  tabIndex={0}
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
                <Button className="sm:text-sm" plain href={'/add-listing/1'}>
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
  )
}

export default Header2
