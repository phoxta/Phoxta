'use client'

import DatePickerCustomDay from '@/components/date-picker-custom-day'
import DatePickerCustomHeaderTwoMonth from '@/components/date-picker-custom-header-two-month'
import { Divider } from '@/components/divider'
import { excludeDateIntervals } from '@/lib/utils'
import { useState } from 'react'
import DatePicker from 'react-datepicker'
import { SectionHeading } from './section-heading'

const SectionDateSingle = () => {
  const [startDate, setStartDate] = useState<Date | null>(new Date())
  const onChangeDate = (date: Date | null) => {
    setStartDate(date)
  }

  return (
    <div className="listingSection__wrap">
      <SectionHeading>Select your dates</SectionHeading>
      <Divider className="w-14!" />

      <DatePicker
        selected={startDate}
        onChange={onChangeDate}
        startDate={startDate}
        monthsShown={2}
        showPopperArrow={false}
        inline
        excludeDateIntervals={excludeDateIntervals}
        renderCustomHeader={(props) => <DatePickerCustomHeaderTwoMonth {...props} />}
        renderDayContents={(day, date) => <DatePickerCustomDay dayOfMonth={day} date={date} />}
      />

      {/* inputs */}
      <input type="hidden" name="startDate" value={startDate ? startDate.toISOString() : ''} />
    </div>
  )
}

export default SectionDateSingle
