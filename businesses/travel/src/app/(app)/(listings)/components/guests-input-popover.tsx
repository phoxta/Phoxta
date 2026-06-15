'use client'

import NcInputNumber from '@/components/nc-input-number'
import { GuestsObject } from '@/type'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { UserPlusIcon } from '@heroicons/react/24/outline'
import { FC, useState } from 'react'

interface Props {
  className?: string
}

const GuestsInputPopover: FC<Props> = ({ className = 'flex-1' }) => {
  const [guestAdultsInputValue, setGuestAdultsInputValue] = useState(2)
  const [guestChildrenInputValue, setGuestChildrenInputValue] = useState(1)
  const [guestInfantsInputValue, setGuestInfantsInputValue] = useState(1)

  const handleChangeData = (value: number, type: keyof GuestsObject) => {
    let newValue = {
      guestAdults: guestAdultsInputValue,
      guestChildren: guestChildrenInputValue,
      guestInfants: guestInfantsInputValue,
    }
    if (type === 'guestAdults') {
      setGuestAdultsInputValue(value)
      newValue.guestAdults = value
    }
    if (type === 'guestChildren') {
      setGuestChildrenInputValue(value)
      newValue.guestChildren = value
    }
    if (type === 'guestInfants') {
      setGuestInfantsInputValue(value)
      newValue.guestInfants = value
    }
  }

  const totalGuests = guestChildrenInputValue + guestAdultsInputValue + guestInfantsInputValue
  return (
    <Popover className={`relative flex ${className}`}>
      {({ open }) => (
        <>
          <div className={`flex flex-1 items-center rounded-b-3xl focus:outline-hidden ${open ? 'shadow-lg' : ''}`}>
            <PopoverButton className="relative z-10 flex flex-1 cursor-pointer items-center gap-x-3 p-3 text-start focus:outline-hidden">
              <div className="text-muted-foreground-lighter">
                <UserPlusIcon className="size-5 lg:size-7" />
              </div>
              <div className="grow">
                <span className="block font-semibold">{totalGuests || ''} Guests</span>
                <span className="mt-1 block text-sm leading-none font-[340] text-gray-400">Add guests</span>
              </div>
            </PopoverButton>
          </div>

          <PopoverPanel
            transition
            unmount={false}
            className="absolute end-0 top-full z-10 mt-3 w-full rounded-3xl bg-popover px-4 py-5 shadow-xl ring-1 ring-border/40 transition duration-150 sm:min-w-85 sm:px-8 sm:py-6 dark:ring-border data-closed:translate-y-1 data-closed:opacity-0"
          >
            <NcInputNumber
              className="w-full"
              defaultValue={guestAdultsInputValue}
              onChange={(value) => handleChangeData(value, 'guestAdults')}
              inputName="guestAdults"
              max={10}
              min={1}
              label={'Adults'}
              description={'Ages 13 or above'}
            />
            <NcInputNumber
              className="mt-6 w-full"
              defaultValue={guestChildrenInputValue}
              onChange={(value) => handleChangeData(value, 'guestChildren')}
              inputName="guestChildren"
              max={4}
              label={'Children'}
              description={'Ages 2–12'}
            />

            <NcInputNumber
              className="mt-6 w-full"
              defaultValue={guestInfantsInputValue}
              onChange={(value) => handleChangeData(value, 'guestInfants')}
              inputName="guestInfants"
              max={4}
              label={'Infants'}
              description={'Ages 0–2'}
            />
          </PopoverPanel>
        </>
      )}
    </Popover>
  )
}

export default GuestsInputPopover
