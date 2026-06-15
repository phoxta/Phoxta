'use client'

import { TExcludeDate } from '@/app/type'
import DatePickerCustomDay from '@/components/date-picker-custom-day'
import DatePickerCustomHeaderTwoMonth from '@/components/date-picker-custom-header-two-month'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { CalendarIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { addDays, subDays } from 'date-fns'
import { FC, useState } from 'react'
import DatePicker from 'react-datepicker'

interface Props {
  className?: string
}

const DateInputPopover: FC<Props> = ({ className = 'flex-1' }) => {
  const [startDate, setStartDate] = useState<Date | null>(new Date())
  //
  const excludeDates: TExcludeDate = [addDays(new Date(), -1), new Date('1-06-01')]

  const onChangeDate = (date: Date | null) => {
    setStartDate(date)
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
          </span>
          <span className="mt-1 block text-sm leading-none font-[340] text-gray-400">Select your date</span>
        </div>
      </>
    )
  }

  return (
    <>
      <Popover className={`group relative z-10 flex ${className}`}>
        {({ open }) => (
          <>
            <PopoverButton className="relative flex flex-1 cursor-pointer items-center gap-x-3 p-3 group-data-open:shadow-lg focus:outline-hidden">
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
                  monthsShown={2}
                  showPopperArrow={false}
                  excludeDates={excludeDates}
                  inline
                  excludeDateIntervals={[{ start: subDays(new Date(), 5000), end: subDays(new Date(), 1) }]}
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
    </>
  )
}

export default DateInputPopover
