'use client'

import { GuestsObject } from '@/type'
import converSelectedDateToString from '@/utils/conver-selected-date-to-string'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import DatesRangeInput from '../dates-range-input'
import FieldPanelContainer from '../field-panel-container'
import GuestsInput from '../guests-input'
import LocationInput from '../location-input'

const StaySearchFormMobile = () => {
  //
  const [fieldNameShow, setFieldNameShow] = useState<'location' | 'dates' | 'guests'>('location')
  //
  const [locationInputTo, setLocationInputTo] = useState('')
  const [guestInput, setGuestInput] = useState<GuestsObject>({
    guestAdults: 0,
    guestChildren: 0,
    guestInfants: 0,
  })
  const [startDate, setStartDate] = useState<Date | null>(new Date('2025/10/05'))
  const [endDate, setEndDate] = useState<Date | null>(new Date('2025/10/09'))
  const router = useRouter()

  const onChangeDate = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates
    setStartDate(start)
    setEndDate(end)
  }
  const handleFormSubmit = (formData: FormData) => {
    const formDataEntries = Object.fromEntries(formData.entries())
    console.log('Form submitted', formDataEntries)
    // You can also redirect or perform other actions based on the form data

    // example: add location to the URL
    const location = formDataEntries['location'] as string
    let url = '/stay-search-with-map'
    if (location) {
      url = url + `?location=${encodeURIComponent(location)}`
    }
    router.push(url)
  }

  //
  const totalGuests = (guestInput.guestAdults || 0) + (guestInput.guestChildren || 0) + (guestInput.guestInfants || 0)
  const guestStringConverted = totalGuests ? `${totalGuests} Guests` : 'Add guests'

  return (
    <Form id="form-hero-search-form-mobile" action={handleFormSubmit} className="flex w-full flex-col gap-y-3">
      {/*  LOCATION */}
      <FieldPanelContainer
        isActive={fieldNameShow === 'location'}
        headingOnClick={() => setFieldNameShow('location')}
        headingTitle="Where"
        headingValue={locationInputTo || 'Location'}
      >
        <LocationInput
          defaultValue={locationInputTo}
          onChange={(value) => {
            setLocationInputTo(value)
            setFieldNameShow('dates')
          }}
        />
      </FieldPanelContainer>

      {/* DATE RANGE  */}
      <FieldPanelContainer
        isActive={fieldNameShow === 'dates'}
        headingOnClick={() => setFieldNameShow('dates')}
        headingTitle="When"
        headingValue={startDate ? converSelectedDateToString([startDate, endDate]) : 'Add dates'}
      >
        <DatesRangeInput defaultStartDate={startDate} defaultEndDate={endDate} onChange={onChangeDate} />
      </FieldPanelContainer>

      {/* GUEST NUMBER */}
      <FieldPanelContainer
        isActive={fieldNameShow === 'guests'}
        headingOnClick={() => setFieldNameShow('guests')}
        headingTitle="Who"
        headingValue={guestStringConverted}
      >
        <GuestsInput defaultValue={guestInput} onChange={setGuestInput} />
      </FieldPanelContainer>
    </Form>
  )
}

export default StaySearchFormMobile
