'use client'

import DatePickerCustomDay from '@/components/date-picker-custom-day'
import DatePickerCustomHeaderTwoMonth from '@/components/date-picker-custom-header-two-month'
import { excludeDateIntervals } from '@/lib/utils'
import clsx from 'clsx'
import { addDays } from 'date-fns'
import { FC, useState } from 'react'
import DatePicker from 'react-datepicker'

interface Props {
  className?: string
  onChange?: (value: [Date | null, Date | null]) => void
  defaultStartDate?: Date | null
  defaultEndDate?: Date | null
}

const StayDatesRangeInput: FC<Props> = ({ className, defaultEndDate, defaultStartDate, onChange }) => {
  const [startDate, setStartDate] = useState<Date | null>(defaultStartDate || new Date())
  const [endDate, setEndDate] = useState<Date | null>(defaultEndDate || addDays(new Date(), 3))

  const onChangeDate = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates
    setStartDate(start)
    setEndDate(end)
    if (onChange) {
      onChange([start, end])
    }
  }

  return (
    <>
      <div className={clsx(className)}>
        <h3 className="block text-center text-xl font-semibold sm:text-2xl">When&lsquo;s your trip?</h3>
        <div className="relative z-10 flex shrink-0 justify-center py-5">
          <DatePicker
            selected={startDate}
            onChange={onChangeDate}
            startDate={startDate}
            endDate={endDate}
            selectsRange
            monthsShown={2}
            showPopperArrow={false}
            inline
            excludeDateIntervals={excludeDateIntervals}
            renderCustomHeader={(p) => <DatePickerCustomHeaderTwoMonth {...p} />}
            renderDayContents={(day, date) => <DatePickerCustomDay dayOfMonth={day} date={date} />}
          />
        </div>
      </div>

      {/* input:hidde */}
      <input type="hidden" name="checkin" value={startDate ? startDate.toISOString().split('T')[0] : ''} />
      <input type="hidden" name="checkout" value={endDate ? endDate.toISOString().split('T')[0] : ''} />
    </>
  )
}

export default StayDatesRangeInput
