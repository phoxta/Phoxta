'use client'

import Logo from '@/components/logo'
import { useInteractOutside } from '@/hooks/use-interact-outside'
import { ListingType } from '@/type'
import * as Headless from '@headlessui/react'
import {
  Airplane02Icon,
  Car05Icon,
  HotAirBalloonFreeIcons,
  House04Icon,
  Menu02Icon,
  Search01Icon,
  UserCircle02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import { usePathname } from 'next/navigation'
import { FC, useCallback, useEffect, useRef, useState } from 'react'
import { useAside } from '../aside'
import HeroSearchFormSmall from '../hero-search-form/hero-search-form-small'
import AvatarDropdown from './avatar-dropdown'

interface Props {
  className?: string
  initSearchFormTab: ListingType
}

const Header3: FC<Props> = ({ className, initSearchFormTab = 'Stays' }) => {
  const headerInnerRef = useRef<HTMLDivElement>(null)
  const [showHeroSearch, setShowHeroSearch] = useState<boolean>(false)
  const lastScrollY = useRef<number>(0)
  const rafId = useRef<number | null>(null)
  const { open: openAside } = useAside()

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
          `fixed inset-0 top-0 z-10 bg-black/40 transition-opacity dark:bg-black/50`,
          showHeroSearch ? 'visible' : 'pointer-events-none invisible opacity-0'
        )}
      />

      {/* Anchor for the header to avoid jumping when the hero search form is shown */}
      {showHeroSearch && <div id="nc-Header-3-anchor" />}

      {/* The header here */}
      <header
        ref={headerInnerRef}
        className={clsx(
          'relative z-20 w-full rounded-full',
          showHeroSearch ? 'text-foreground' : 'text-white',
          className
        )}
      >
        <div className="relative flex py-3">
          <div className="container flex h-20 flex-1 justify-between">
            {/* Logo (lg+) */}
            <div className="relative z-11 flex flex-1/2 items-center">
              <Logo />
            </div>

            <div className="mx-auto flex w-full max-w-lg shrink-0 justify-center">
              {/* BUTTON SHOW HERO SEARCH FORM DESKTOP */}
              <Headless.Transition show={!showHeroSearch}>
                <button
                  className={clsx(
                    'relative flex h-12 cursor-pointer justify-between gap-3 self-center rounded-full border border-white/25 bg-white/15 text-white backdrop-blur-md transition-all hover:bg-white/20',
                    // Entering styles
                    'data-enter:duration-300 data-enter:data-closed:-translate-y-5 data-enter:data-closed:opacity-0',
                    // Leaving styles
                    'data-leave:duration-100 data-leave:data-closed:opacity-0'
                  )}
                  onClick={() => setShowHeroSearch(true)}
                  onTouchStart={() => setShowHeroSearch(true)}
                  role="button"
                  tabIndex={1}
                >
                  <div className="flex items-center gap-3.5 ps-4 text-sm font-[450] whitespace-nowrap select-none">
                    <div>
                      {initSearchFormTab === 'Stays' && (
                        <HugeiconsIcon icon={House04Icon} strokeWidth={1.3} size={28} className="-mt-0.5" />
                      )}
                      {initSearchFormTab === 'Cars' && <HugeiconsIcon icon={Car05Icon} size={28} />}
                      {initSearchFormTab === 'Experiences' && <HugeiconsIcon icon={HotAirBalloonFreeIcons} size={28} />}
                      {initSearchFormTab === 'Flights' && <HugeiconsIcon icon={Airplane02Icon} size={28} />}
                    </div>
                    <div className="block cursor-pointer">{locationText}</div>
                    <div className="h-5 w-px bg-white/20"></div>
                    <div className="block cursor-pointer">{dateText}</div>
                    {initSearchFormTab !== 'Cars' && <div className="h-5 w-px bg-white/20"></div>}
                    {initSearchFormTab !== 'Cars' && <div className="block cursor-pointer">{guestsText}</div>}
                  </div>

                  <div className="flex shrink-0 cursor-pointer items-center justify-center p-2">
                    <div className="flex size-8 items-center justify-center rounded-full bg-black/12 text-white">
                      <HugeiconsIcon icon={Search01Icon} size={16} strokeWidth={1.6} />
                    </div>
                  </div>
                </button>
              </Headless.Transition>

              {/* HERO SEARCH FORM - DESKTOP */}
              <Headless.Transition show={showHeroSearch}>
                <div
                  className={clsx(
                    'absolute inset-x-0 top-0 z-10 transition ease-in-out',
                    // Entering styles
                    'data-enter:duration-200 data-enter:data-closed:-translate-y-20 data-enter:data-closed:opacity-0',
                    // Leaving styles
                    'data-leave:duration-150 data-leave:data-closed:opacity-0'
                  )}
                >
                  <div className="absolute inset-x-0 right-0 -z-10 h-full bg-background" />
                  <div className="mx-auto w-full max-w-4xl pb-8">
                    <HeroSearchFormSmall initTab={initSearchFormTab} />
                  </div>
                </div>
              </Headless.Transition>
            </div>

            <div className="relative z-10 flex flex-1/2 items-center justify-end gap-x-1">
              <AvatarDropdown
                triggerButton={
                  <button className="flex size-11 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-black/10 hover:backdrop-blur-sm data-active:bg-black/10 data-active:backdrop-blur-sm">
                    <HugeiconsIcon icon={UserCircle02Icon} size={24} />
                  </button>
                }
              />
              <button
                className="flex size-11 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-black/10 hover:backdrop-blur-sm data-active:bg-black/10 data-active:backdrop-blur-sm"
                onClick={() => openAside('sidebar-navigation')}
              >
                <span className="sr-only">Open main menu</span>
                <HugeiconsIcon icon={Menu02Icon} size={24} />
              </button>
            </div>
          </div>
        </div>
      </header>
    </>
  )
}

export default Header3
