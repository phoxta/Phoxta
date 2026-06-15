'use client'

import { Checkbox, CheckboxField, CheckboxGroup } from '@/components/checkbox'
import { Divider } from '@/components/divider'
import { Fieldset, Label } from '@/components/fieldset'
import { Heading } from '@/components/heading'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const generalAmenities = [
  {
    label: 'Wifi',
    name: 'Wifi',
    defaultChecked: true,
  },
  {
    label: 'Internet',
    name: 'Internet',
  },
  {
    label: 'TV',
    name: 'TV',
    defaultChecked: true,
  },
  {
    label: 'Air conditioning',
    name: 'Air conditioning',
  },
  {
    label: 'Fan',
    name: 'Fan',
  },
  {
    label: 'Private entrance',
    name: 'Private entrance',
  },
  {
    label: 'Dryer',
    name: 'Dryer',
    defaultChecked: true,
  },
  {
    label: 'Heater',
    name: 'Heater',
  },
  {
    label: 'Washing machine',
    name: 'Washing machine',
  },
  {
    label: 'Detergent',
    name: 'Detergent',
    defaultChecked: true,
  },
  {
    label: 'Clothes dryer',
    name: 'Clothes dryer',
  },
]
const otherAmenities = [
  {
    label: 'Wardrobe',
    name: 'Wardrobe',
    defaultChecked: true,
  },
  {
    label: 'Cloth hook',
    name: 'Cloth hook',
  },
  {
    label: 'Extra cushion',
    name: 'Extra cushion',
    defaultChecked: true,
  },
  {
    label: 'Gas stove',
    name: 'Gas stove',
  },
  {
    label: 'Toilet paper',
    name: 'Toilet paper',
  },
  {
    label: 'Free toiletries',
    name: 'Free toiletries',
    defaultChecked: true,
  },
  {
    label: 'Makeup table',
    name: 'Makeup table',
  },
  {
    label: 'Hot pot',
    name: 'Hot pot',
  },
  {
    label: 'Bathroom heaters',
    name: 'Bathroom heaters',
  },
  {
    label: 'Kettle',
    name: 'Kettle',
    defaultChecked: true,
  },
  {
    label: 'Dishwasher',
    name: 'Dishwasher',
  },
  {
    label: 'BBQ grill',
    name: 'BBQ grill',
    defaultChecked: true,
  },
]
const safeAmenities = [
  {
    label: 'Fire siren',
    name: 'Fire siren',
    defaultChecked: true,
  },
  {
    label: 'Fire extinguisher',
    name: 'Fire extinguisher',
  },
  {
    label: 'Anti-theft key',
    name: 'Anti-theft key',
    defaultChecked: true,
  },
  {
    label: 'Safe vault',
    name: 'Safe vault',
  },
]

const Page = () => {
  const router = useRouter()

  // Prefetch the next step to improve performance
  useEffect(() => {
    router.prefetch('/add-listing/5')
  }, [router])

  const handleSubmitForm = async (formData: FormData) => {
    const formObject = Object.fromEntries(formData.entries())
    // Handle form submission logic here
    console.log('Form submitted:', formObject)

    // Redirect to the next step
    router.push('/add-listing/5')
  }

  return (
    <>
      <div>
        <Heading>What amenities your place offers</Heading>
      </div>
      <Divider />

      {/* FORM */}
      <Form id="add-listing-form" action={handleSubmitForm} className="flex flex-col gap-y-12">
        <div>
          <p className="text-lg font-medium">General amenities</p>
          <Fieldset className="mt-6">
            <CheckboxGroup className="grid grid-cols-1 gap-4 space-y-0! sm:grid-cols-2 sm:gap-y-6 lg:grid-cols-3">
              {generalAmenities.map((amenity) => (
                <CheckboxField key={amenity.name}>
                  <Label>{amenity.label}</Label>
                  <Checkbox name={'amenities[]'} value={amenity.name} defaultChecked={amenity.defaultChecked} />
                </CheckboxField>
              ))}
            </CheckboxGroup>
          </Fieldset>
        </div>

        <Divider />
        <div>
          <p className="text-lg font-medium">Other amenities</p>
          <Fieldset className="mt-6">
            <CheckboxGroup className="grid grid-cols-1 gap-4 space-y-0! sm:grid-cols-2 sm:gap-y-6 lg:grid-cols-3">
              {otherAmenities.map((amenity) => (
                <CheckboxField key={amenity.name}>
                  <Label>{amenity.label}</Label>
                  <Checkbox name={'otherAmenities[]'} value={amenity.name} defaultChecked={amenity.defaultChecked} />
                </CheckboxField>
              ))}
            </CheckboxGroup>
          </Fieldset>
        </div>
        <Divider />

        <div>
          <p className="text-lg font-medium">Safe amenities</p>
          <Fieldset className="mt-6">
            <CheckboxGroup className="grid grid-cols-1 gap-4 space-y-0! sm:grid-cols-2 sm:gap-y-6 lg:grid-cols-3">
              {safeAmenities.map((amenity) => (
                <CheckboxField key={amenity.name}>
                  <Label>{amenity.label}</Label>
                  <Checkbox name={'safeAmenities[]'} value={amenity.name} defaultChecked={amenity.defaultChecked} />
                </CheckboxField>
              ))}
            </CheckboxGroup>
          </Fieldset>
        </div>
        <Divider />
      </Form>
    </>
  )
}

export default Page
