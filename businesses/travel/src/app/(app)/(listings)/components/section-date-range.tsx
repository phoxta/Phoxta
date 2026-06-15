'use client'

import DatePickerCustomDay from '@/components/date-picker-custom-day'
import DatePickerCustomHeaderTwoMonth from '@/components/date-picker-custom-header-two-month'
import { Divider } from '@/components/divider'
import { excludeDateIntervals } from '@/lib/utils'
import { addDays } from 'date-fns'
import { useState } from 'react'
import DatePicker from 'react-datepicker'
import { SectionHeading } from './section-heading'

const SectionDateRange = () => {
  const [startDate, setStartDate] = useState<Date | null>(new Date())
  const [endDate, setEndDate] = useState<Date | null>(addDays(new Date(), 3))

  const onChangeDate = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates
    setStartDate(start)
    setEndDate(end)
  }

  return (
    <div className="listingSection__wrap">
      <SectionHeading>Select your dates</SectionHeading>
      <Divider className="w-14!" />

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
        renderCustomHeader={(props) => <DatePickerCustomHeaderTwoMonth {...props} />}
        renderDayContents={(day, date) => <DatePickerCustomDay dayOfMonth={day} date={date} />}
      />

      {/* inputs */}
      <input type="hidden" name="startDate" value={startDate ? startDate.toISOString() : ''} />
      <input type="hidden" name="endDate" value={endDate ? endDate.toISOString() : ''} />
    </div>
  )
}

export default SectionDateRange
