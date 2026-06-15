'use client'

import { Divider } from '@/components/divider'
import { Heading } from '@/components/heading'
import NcInputNumber from '@/components/nc-input-number'
import Select from '@/components/select'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import FormItem from '../form-item'

const Page = () => {
  const router = useRouter()

  // Prefetch the next step to improve performance
  useEffect(() => {
    router.prefetch('/add-listing/4')
  }, [router])

  const handleSubmitForm = async (formData: FormData) => {
    const formObject = Object.fromEntries(formData.entries())
    // Handle form submission logic here
    console.log('Form submitted:', formObject)

    // Redirect to the next step
    router.push('/add-listing/4')
  }

  return (
    <>
      <Heading>Your place details</Heading>

      {/* FORM */}
      <Form id="add-listing-form" action={handleSubmitForm} className="mt-5 space-y-5">
        {/* ITEM */}
        <FormItem label="Acreage (m2)">
          <Select name="acreage">
            <option value="100">100</option>
            <option value="200">200</option>
            <option value="300">300</option>
            <option value="400">400</option>
            <option value="500">500</option>
          </Select>
        </FormItem>
        <Divider />
        <NcInputNumber inputName="Guests" label="Guests" defaultValue={4} />
        <Divider />
        <NcInputNumber inputName="Bedroom" label="Bedroom" defaultValue={4} />
        <Divider />
        <NcInputNumber inputName="Beds" label="Beds" defaultValue={4} />
        <Divider />
        <NcInputNumber inputName="Bathroom" label="Bathroom" defaultValue={2} />
        <Divider />
        <NcInputNumber inputName="Kitchen" label="Kitchen" defaultValue={2} />
        <Divider />
      </Form>
    </>
  )
}

export default Page
