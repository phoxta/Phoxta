'use client'

import { ButtonCircle } from '@/components/button'
import ButtonPrimary from '@/components/button-primary'
import ButtonThird from '@/components/button-third'
import { ListingType } from '@/type'
import { CloseButton, Dialog, DialogPanel, Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/solid'
import {
  Airplane02Icon,
  Car05Icon,
  FilterVerticalIcon,
  HotAirBalloonFreeIcons,
  House04Icon,
  Search01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon, IconSvgElement } from '@hugeicons/react'
import clsx from 'clsx'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useTimeoutFn } from 'react-use'
import CarSearchFormMobile from './car-search-form/car-search-form-mobile'
import ExperienceSearchFormMobile from './experience-search-form/experience-search-form-mobile'
import FlightSearchFormMobile from './flight-search-form/flight-search-form-mobile'
import StaySearchFormMobile from './stay-search-form/stay-search-form-mobile'

const formTabs: { name: ListingType; icon: IconSvgElement; formComponent: React.ComponentType<{}> }[] = [
  { name: 'Stays', icon: House04Icon, formComponent: StaySearchFormMobile },
  { name: 'Experiences', icon: HotAirBalloonFreeIcons, formComponent: ExperienceSearchFormMobile },
  { name: 'Cars', icon: Car05Icon, formComponent: CarSearchFormMobile },
  { name: 'Flights', icon: Airplane02Icon, formComponent: FlightSearchFormMobile },
]

const HeroSearchFormMobile = ({ className }: { className?: string }) => {
  const [showModal, setShowModal] = useState(false)

  // FOR RESET ALL DATA WHEN CLICK CLEAR BUTTON
  const [showDialog, setShowDialog] = useState(false)
  let [, , resetIsShowingDialog] = useTimeoutFn(() => setShowDialog(true), 1)
  //

  // pathname
  const pathname = usePathname()

  let locationText = 'Where to?'
  let weekText = 'Any week'
  let guestsText = 'Add guests'
  let activeTabName: ListingType = 'Stays'

  // TODO: Check that the pathname matches each listing type.
  if (pathname.startsWith('/experience')) {
    activeTabName = 'Experiences'
    if (pathname.startsWith('/experience-search')) {
      locationText = 'Experiences in Bali'
      weekText = 'Mar 22 - 27'
      guestsText = '2 guests'
    }
  } else if (pathname.startsWith('/car')) {
    activeTabName = 'Cars'
    if (pathname.startsWith('/car-search')) {
      locationText = 'Car rentals in Tokyo'
      weekText = 'Mar 25 - 28'
      guestsText = ''
    }
  } else if (pathname.startsWith('/flight')) {
    activeTabName = 'Flights'
    if (pathname.startsWith('/flight-search')) {
      locationText = 'Flights to Rome'
      weekText = 'Mar 10 - 15'
      guestsText = '1 guest'
    }
  } else if (pathname.startsWith('/stay')) {
    activeTabName = 'Stays'
    if (pathname.startsWith('/stay-search')) {
      locationText = 'Homes in London'
      weekText = 'Mar 20 - 25'
      guestsText = '1 guest'
    }
  }

  const defaultIndex = Math.max(
    0,
    formTabs.findIndex((t) => t.name === activeTabName)
  )

  function closeModal() {
    setShowModal(false)
  }

  function openModal() {
    setShowModal(true)
  }

  const renderButtonOpenModal = () => {
    return (
      <button
        onClick={openModal}
        className="relative flex w-full items-center rounded-full shadow-md-for-card bg-card px-4 py-2 focus:outline-none sm:pe-11"
      >
        <HugeiconsIcon icon={Search01Icon} size={20} />

        <div className="ms-4 flex-1 overflow-hidden text-start">
          <span className="block text-sm/5 font-medium">{locationText}</span>
          <span className="mt-px flex gap-2 text-sm/5 font-[350] text-muted-foreground">
            {weekText} {activeTabName !== 'Cars' && <span>•</span>}
            {activeTabName !== 'Cars' && <span>{guestsText}</span>}
          </span>
        </div>

        <div className="absolute end-2 top-1/2 hidden size-9 -translate-y-1/2 transform items-center justify-center rounded-full border border-border sm:flex">
          <HugeiconsIcon icon={FilterVerticalIcon} size={16} />
        </div>
      </button>
    )
  }

  return (
    <div className={clsx(className, 'relative z-10 w-full max-w-lg')}>
      {renderButtonOpenModal()}
      <Dialog as="div" className="relative z-max" onClose={closeModal} open={showModal}>
        <div className="fixed inset-0 bg-accent">
          <div className="flex h-full">
            <DialogPanel
              transition
              className="relative flex-1 transition data-closed:translate-y-28 data-closed:opacity-0"
            >
              {showDialog && (
                <TabGroup
                  manual
                  className="relative flex h-full flex-1 flex-col justify-between"
                  defaultIndex={defaultIndex}
                >
                  <div className="absolute inset-e-3 top-2 z-10">
                    <CloseButton color="light" as={ButtonCircle} className="size-7!">
                      <XMarkIcon className="size-4!" />
                    </CloseButton>
                  </div>

                  <TabList className="flex justify-center gap-x-8 sm:gap-x-14">
                    {formTabs.map((tab) => {
                      return (
                        <Tab
                          key={tab.name}
                          className={clsx(
                            'group relative -mx-3 flex shrink-0 cursor-pointer items-center justify-center px-3 pt-10 pb-5 text-neutral-400 data-[selected]:text-foreground'
                          )}
                        >
                          <div className="relative">
                            <span className="sr-only">{tab.name}</span>
                            <HugeiconsIcon icon={tab.icon} size={26} />
                            <span className="absolute top-full mt-1 hidden h-0.5 w-full bg-foreground group-data-[selected]:block" />
                          </div>
                        </Tab>
                      )
                    })}
                  </TabList>

                  <TabPanels className="flex flex-1 overflow-hidden px-1.5 sm:px-4">
                    <div className="hidden-scrollbar flex-1 overflow-y-auto pt-2 pb-4">
                      {formTabs.map((tab) => (
                        <TabPanel
                          key={tab.name}
                          as="div"
                          className="animate-[myblur_0.4s_ease-in-out] transition-opacity"
                        >
                          <tab.formComponent />
                        </TabPanel>
                      ))}
                    </div>
                  </TabPanels>
                  <div className="flex justify-between border-t border-border bg-background px-4 py-3">
                    <ButtonThird
                      onClick={() => {
                        setShowDialog(false)
                        resetIsShowingDialog()
                      }}
                    >
                      Clear all
                    </ButtonThird>
                    <ButtonPrimary type="submit" form="form-hero-search-form-mobile" onClick={closeModal}>
                      <HugeiconsIcon icon={Search01Icon} size={16} />
                      <span>Search</span>
                    </ButtonPrimary>
                  </div>
                </TabGroup>
              )}
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

export default HeroSearchFormMobile
