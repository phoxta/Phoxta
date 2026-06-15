'use client'

import NcInputNumber from '@/components/nc-input-number'
import { GuestsObject } from '@/type'
import * as Headless from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/24/solid'
import clsx from 'clsx'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { FC, useEffect, useState } from 'react'
import { ButtonSubmit, DateRangeField, LocationInputField, VerticalDividerLine } from './ui'

interface Props {
  className?: string
  formStyle: 'default' | 'small'
}

const flightClass = [
  {
    name: 'Economy',
    href: '#',
  },
  {
    name: 'Business',
    href: '#',
  },
  {
    name: 'Multiple',
    href: '#',
  },
]

export const FlightSearchForm: FC<Props> = ({ className, formStyle = 'default' }) => {
  const [tripType, setTripType] = useState<'roundTrip' | 'oneWay'>('roundTrip')
  const [flightClassState, setFlightClassState] = useState('Economy')

  const [guestAdultsInputValue, setGuestAdultsInputValue] = useState(2)
  const [guestChildrenInputValue, setGuestChildrenInputValue] = useState(1)
  const [guestInfantsInputValue, setGuestInfantsInputValue] = useState(1)
  const router = useRouter()

  // Prefetch the stay categories page to improve performance
  useEffect(() => {
    router.prefetch('/flight-search')
  }, [router])

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

  const handleFormSubmit = (formData: FormData) => {
    const formDataEntries = Object.fromEntries(formData.entries())
    console.log('Form submitted', formDataEntries)
    // You can also redirect or perform other actions based on the form data

    // example: add location to the URL
    const location = formDataEntries['flying-from-location'] as string
    let url = '/flight-search'
    if (location) {
      url = url + `?location=${encodeURIComponent(location)}`
    }
    router.push(url)
  }

  const totalGuests = guestChildrenInputValue + guestAdultsInputValue + guestInfantsInputValue

  const renderGuest = () => {
    return (
      <Headless.Popover className="group relative">
        <Headless.PopoverButton className="flex cursor-pointer items-center gap-2 rounded-full border border-neutral-300 px-4 py-1.5 text-xs font-medium dark:border-neutral-700">
          <span>{totalGuests || ''} Guests</span>
          <ChevronDownIcon className="-me-1 size-3.5 group-data-open:rotate-180" />
        </Headless.PopoverButton>

        <Headless.PopoverPanel
          unmount={false}
          transition
          className="absolute top-full left-1/2 z-20 mt-3 w-84 -translate-x-1/2 rounded-3xl bg-white px-4 py-5 shadow-xl ring-1 ring-black/5 transition duration-150 sm:px-8 sm:py-6 dark:bg-neutral-800 dark:ring-white/10 data-closed:translate-y-1 data-closed:opacity-0"
        >
          <NcInputNumber
            className="w-full"
            defaultValue={guestAdultsInputValue}
            onChange={(value) => handleChangeData(value, 'guestAdults')}
            max={10}
            min={1}
            label={'Adults'}
            description={'Ages 13 or above'}
            inputName="guestAdults"
          />
          <NcInputNumber
            className="mt-6 w-full"
            defaultValue={guestChildrenInputValue}
            onChange={(value) => handleChangeData(value, 'guestChildren')}
            max={4}
            label={'Children'}
            description={'Ages 2–12'}
            inputName="guestChildren"
          />

          <NcInputNumber
            className="mt-6 w-full"
            defaultValue={guestInfantsInputValue}
            onChange={(value) => handleChangeData(value, 'guestInfants')}
            max={4}
            label={'Infants'}
            description={'Ages 0–2'}
            inputName="guestInfants"
          />
        </Headless.PopoverPanel>
      </Headless.Popover>
    )
  }

  const renderSelectClassType = () => {
    return (
      <>
        <Headless.Popover className="group relative">
          <Headless.PopoverButton className="flex cursor-pointer items-center gap-2 rounded-full border border-neutral-300 px-4 py-1.5 text-xs font-medium dark:border-neutral-700">
            <span>{flightClassState}</span>
            <ChevronDownIcon className="-me-1 size-3.5 group-data-open:rotate-180" />
          </Headless.PopoverButton>

          <Headless.PopoverPanel
            transition
            className="absolute top-full left-1/2 z-20 mt-3 w-56 -translate-x-1/2 transition duration-150 data-closed:translate-y-1 data-closed:opacity-0"
          >
            <div className="relative grid gap-7 rounded-2xl bg-white p-6 shadow-lg ring-1 ring-black/5 dark:bg-neutral-800 dark:ring-white/10">
              {flightClass.map((item) => (
                <Headless.CloseButton
                  key={item.name}
                  onClick={() => {
                    setFlightClassState(item.name)
                  }}
                  className="-m-3 flex cursor-pointer items-center rounded-lg p-2 text-sm font-medium hover:bg-gray-50 focus:outline-hidden focus-visible:ring-3 focus-visible:ring-orange-500/50 dark:hover:bg-gray-700"
                >
                  {item.name}
                </Headless.CloseButton>
              ))}
            </div>
          </Headless.PopoverPanel>
        </Headless.Popover>

        {/* hidden inputs */}
        <input type="hidden" name="flight-class-type" value={flightClassState} />
      </>
    )
  }

  const renderTripType = () => {
    return (
      <Headless.RadioGroup
        value={tripType}
        onChange={setTripType}
        aria-label="Trip Type"
        name="trip-type"
        className="flex flex-wrap items-center gap-2.5"
      >
        <Headless.Radio
          value="roundTrip"
          className={`flex cursor-pointer items-center rounded-full border border-neutral-300 px-4 py-1.5 text-xs font-medium dark:border-neutral-700 data-checked:bg-black data-checked:text-white data-checked:shadow-lg data-checked:shadow-black/10 dark:data-checked:bg-neutral-200 dark:data-checked:text-neutral-900`}
        >
          Round-trip
        </Headless.Radio>
        <Headless.Radio
          value="oneWay"
          className={`flex cursor-pointer items-center rounded-full border border-neutral-300 px-4 py-1.5 text-xs font-medium dark:border-neutral-700 data-checked:bg-black data-checked:text-white data-checked:shadow-lg data-checked:shadow-black/10 dark:data-checked:bg-neutral-200 dark:data-checked:text-neutral-900`}
        >
          One-way
        </Headless.Radio>
      </Headless.RadioGroup>
    )
  }

  return (
    <Form
      className={clsx(
        'relative z-10 w-full shadow-lg-for-card bg-white [--form-bg:var(--color-white)] dark:bg-neutral-800 dark:[--form-bg:var(--color-neutral-800)]',
        className,
        formStyle === 'small' && 'rounded-t-2xl rounded-b-4xl',
        formStyle === 'default' && 'rounded-t-2xl rounded-b-[40px] xl:rounded-t-3xl xl:rounded-b-[48px]'
      )}
      action={handleFormSubmit}
    >
      <div
        className={clsx(
          'flex flex-wrap items-center gap-2.5 border-b border-neutral-100 dark:border-neutral-700',
          formStyle === 'small' && 'px-7 py-4 xl:px-8',
          formStyle === 'default' && 'px-7 py-4 xl:px-8 xl:py-6'
        )}
      >
        {renderTripType()}
        <div className="mx-2 h-7 self-center border-r" />
        {renderSelectClassType()}
        {renderGuest()}
      </div>

      <div className="relative z-10 flex flex-1 rounded-full">
        <LocationInputField
          inputName="flying-from-location"
          placeholder={'Flying from'}
          description={'Where are you flying from?'}
          className="hero-search-form__field-after flex-1"
          fieldStyle={formStyle}
        />
        <VerticalDividerLine />
        <LocationInputField
          inputName="flying-to-location"
          placeholder={'Flying to'}
          description={'Where are you flying to?'}
          className="hero-search-form__field-before hero-search-form__field-after flex-1"
          fieldStyle={formStyle}
        />
        <VerticalDividerLine />
        <DateRangeField
          fieldStyle={formStyle}
          className="hero-search-form__field-before flex-1"
          panelClassName="sm:start-auto sm:translate-x-0 sm:end-0"
          description={tripType === 'oneWay' ? 'Flying date' : 'Flying dates'}
          isOnlySingleDate={tripType === 'oneWay'}
          clearDataButtonClassName={clsx(formStyle === 'small' && 'sm:end-18', formStyle === 'default' && 'sm:end-22')}
        />

        <ButtonSubmit fieldStyle={formStyle} />
      </div>
    </Form>
  )
}
