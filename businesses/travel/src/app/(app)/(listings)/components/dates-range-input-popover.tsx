'use client'

import DatePickerCustomDay from '@/components/date-picker-custom-day'
import DatePickerCustomHeaderTwoMonth from '@/components/date-picker-custom-header-two-month'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { CalendarIcon, XMarkIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { addDays, subDays } from 'date-fns'
import { FC, useState } from 'react'
import DatePicker from 'react-datepicker'

interface Props {
  className?: string
  btnClassName?: string
  inputDescription?: string
}

const DatesRangeInputPopover: FC<Props> = ({
  className = 'flex-1',
  btnClassName,
  inputDescription = 'Check-in / Check-out',
}) => {
  const [startDate, setStartDate] = useState<Date | null>(new Date())
  const [endDate, setEndDate] = useState<Date | null>(addDays(new Date(), 3))
  //

  const onChangeDate = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates
    setStartDate(start)
    setEndDate(end)
  }

  const renderInput = () => {
    return (
      <>
        <div className="text-muted-foreground-lighter">
          <CalendarIcon className="size-5 lg:size-7" />
        </div>
        <div className="grow text-start">
          <span className="block font-semibold">
            {startDate?.toLocaleDateString('en-US', {
              month: 'short',
              day: '2-digit',
            }) || 'Add dates'}
            {endDate
              ? ' - ' +
                endDate?.toLocaleDateString('en-US', {
                  month: 'short',
                  day: '2-digit',
                })
              : ''}
          </span>
          <span className="mt-1 block text-sm leading-none font-[340] text-gray-400">{inputDescription}</span>
        </div>
      </>
    )
  }

  return (
    <>
      <Popover className={`group relative z-10 flex ${className}`}>
        {({ open }) => (
          <>
            <PopoverButton
              className={clsx(
                'relative flex flex-1 cursor-pointer items-center gap-x-3 p-3 group-data-open:shadow-lg focus:outline-hidden',
                btnClassName
              )}
            >
              {renderInput()}
              {startDate && open && (
                <span
                  className={
                    'absolute end-1 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 transform items-center justify-center rounded-full bg-gray-100 text-sm lg:end-3 lg:h-6 lg:w-6 dark:bg-gray-800'
                  }
                >
                  <XMarkIcon className="size-4" />
                </span>
              )}
            </PopoverButton>

            <PopoverPanel
              transition
              className="absolute start-auto -end-2 top-full z-10 mt-3 w-[calc(100%+1rem)] transition duration-150 lg:w-3xl xl:-end-10 data-closed:translate-y-1 data-closed:opacity-0"
            >
              <div className="overflow-hidden rounded-3xl bg-popover py-5 shadow-lg ring-1 ring-border/40 sm:p-8 dark:ring-border">
                <DatePicker
                  selected={startDate}
                  onChange={onChangeDate}
                  startDate={startDate}
                  endDate={endDate}
                  selectsRange
                  monthsShown={2}
                  showPopperArrow={false}
                  excludeDateIntervals={[{ start: subDays(new Date(), 5000), end: subDays(new Date(), 1) }]}
                  inline
                  renderCustomHeader={(p) => <DatePickerCustomHeaderTwoMonth {...p} />}
                  renderDayContents={(day, date) => <DatePickerCustomDay dayOfMonth={day} date={date} />}
                />
              </div>
            </PopoverPanel>
          </>
        )}
      </Popover>

      {/* inputs */}
      <input type="hidden" name="startDate" value={startDate ? startDate.toISOString() : ''} />
      <input type="hidden" name="endDate" value={endDate ? endDate.toISOString() : ''} />
    </>
  )
}

export default DatesRangeInputPopover
