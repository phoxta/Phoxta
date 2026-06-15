'use client'

import DatePickerCustomDay from '@/components/date-picker-custom-day'
import DatePickerCustomHeaderTwoMonth from '@/components/date-picker-custom-header-two-month'
import { Divider } from '@/components/divider'
import { Heading } from '@/components/heading'
import NcInputNumber from '@/components/nc-input-number'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import DatePicker from 'react-datepicker'

const PageAddListing9 = () => {
  const [dates, setDates] = useState<number[]>([
    new Date().getTime(),
    new Date(new Date().getTime() + 60 * 60 * 24 * 1000).getTime(),
    new Date(new Date().getTime() + 3 * 60 * 60 * 24 * 1000).getTime(),
    new Date(new Date().getTime() + 4 * 60 * 60 * 24 * 1000).getTime(),
  ])
  const router = useRouter()

  // Prefetch the next step to improve performance
  useEffect(() => {
    router.prefetch('/add-listing/10')
  }, [router])

  const handleSubmitForm = async (formData: FormData) => {
    const formObject = Object.fromEntries(formData.entries())
    // Handle form submission logic here
    console.log('Form submitted:', formObject)

    // Redirect to the next step
    router.push('/add-listing/10')
  }

  return (
    <>
      <div>
        <Heading>How long can guests stay?</Heading>
        <span className="mt-2 block text-muted-foreground">
          Shorter trips can mean more reservations, but you&apos;ll turn over your space more often.
        </span>
      </div>
      <Divider />

      <Form id="add-listing-form" action={handleSubmitForm} className="flex flex-col gap-y-5">
        <NcInputNumber inputName="Nights-min" label="Nights min" defaultValue={1} />
        <NcInputNumber inputName="Nights-max" label="Nights max" defaultValue={90} />

        {dates
          .map((item) => new Date(item))
          .map((date, index) => (
            <input type="hidden" name="excludeDates[]" key={index} value={date.toISOString()} />
          ))}
      </Form>

      <div className="mt-5">
        <Heading fontSize="text-2xl">Availability</Heading>
        <span className="mt-2 block text-muted-foreground">Select the dates your place is available.</span>
      </div>

      <div className="addListingDatePickerExclude">
        <DatePicker
          onChange={(date: Date | null) => {
            let newDates = []

            if (!date) {
              return
            }
            const newTime = date.getTime()
            if (dates.includes(newTime)) {
              newDates = dates.filter((item) => item !== newTime)
            } else {
              newDates = [...dates, newTime]
            }
            setDates(newDates)
          }}
          // selected={startDate}
          monthsShown={2}
          showPopperArrow={false}
          excludeDates={dates.filter(Boolean).map((item) => new Date(item))}
          inline
          renderCustomHeader={(p) => <DatePickerCustomHeaderTwoMonth {...p} />}
          renderDayContents={(day, date) => <DatePickerCustomDay dayOfMonth={day} date={date} />}
        />
      </div>

      <Divider />
    </>
  )
}

export default PageAddListing9
