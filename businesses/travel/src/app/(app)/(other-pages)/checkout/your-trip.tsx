'use client'

import ModalSelectDate from '@/components/modal-select-date'
import ModalSelectGuests from '@/components/modal-select-guests'
import { GuestsObject } from '@/type'
import converSelectedDateToString from '@/utils/conver-selected-date-to-string'
import { PencilSquareIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'

const YourTrip = () => {
  const [startDate, setStartDate] = useState<Date | null>(new Date('2025/02/06'))
  const [endDate, setEndDate] = useState<Date | null>(new Date('2025/02/23'))
  const [guests, setGuests] = useState<GuestsObject>({
    guestAdults: 2,
    guestChildren: 1,
    guestInfants: 1,
  })

  return (
    <div>
      <h3 className="text-2xl font-medium">Your trip</h3>
      <div className="z-10 mt-6 flex flex-col divide-y divide-neutral-200 overflow-hidden rounded-3xl border border-neutral-200 sm:flex-row sm:divide-x sm:divide-y-0 sm:rtl:divide-x-reverse dark:divide-neutral-700 dark:border-neutral-700">
        <ModalSelectDate
          onChange={(dates) => {
            const [start, end] = dates
            setStartDate(start)
            setEndDate(end)
          }}
          triggerButton={({ openModal }) => (
            <button
              onClick={openModal}
              className="flex flex-1 justify-between gap-x-5 bg-card p-5 text-start hover:bg-accent focus-visible:outline-hidden"
              type="button"
            >
              <div className="flex flex-col">
                <span className="text-sm text-neutral-400">Date range</span>
                <span className="mt-1.5 text-lg font-medium">
                  {startDate ? converSelectedDateToString([startDate, endDate]) : 'Add dates'}
                </span>
              </div>
              <PencilSquareIcon className="size-6 text-muted-foreground" />
            </button>
          )}
        />

        <ModalSelectGuests
          onChangeGuests={setGuests}
          triggerButton={({ openModal }) => (
            <button
              type="button"
              onClick={openModal}
              className="flex flex-1 justify-between gap-x-5 bg-card p-5 text-start hover:bg-accent focus-visible:outline-hidden"
            >
              <div className="flex flex-col">
                <span className="text-sm text-neutral-400">Guests</span>
                <span className="mt-1.5 text-lg font-medium">
                  <span className="line-clamp-1">
                    {`${
                      (guests.guestAdults || 0) + (guests.guestChildren || 0)
                    } Guests, ${guests.guestInfants || 0} Infants`}
                  </span>
                </span>
              </div>
              <PencilSquareIcon className="size-6 text-muted-foreground" />
            </button>
          )}
        />
      </div>

      <p className="mt-2 text-sm text-muted-foreground">Click on the pencil icon to change your trip details.</p>

      <input type="hidden" name="guestAdults" value={guests.guestAdults} />
      <input type="hidden" name="guestChildren" value={guests.guestChildren} />
      <input type="hidden" name="guestInfants" value={guests.guestInfants} />
      {/*  */}
      <input type="hidden" name="startDate" value={startDate ? startDate.toISOString() : ''} />
      <input type="hidden" name="endDate" value={endDate ? endDate.toISOString() : ''} />
    </div>
  )
}

export default YourTrip
