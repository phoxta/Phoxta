'use client'

import { Divider } from '@/components/divider'
import { Heading } from '@/components/heading'
import Input from '@/components/input'
import Select from '@/components/select'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import FormItem from '../form-item'

const Page = () => {
  const router = useRouter()

  // Prefetch the next step to improve performance
  useEffect(() => {
    router.prefetch('/add-listing/2')
  }, [router])

  const handleSubmitForm = async (formData: FormData) => {
    const formObject = Object.fromEntries(formData.entries())
    // Handle form submission logic here
    console.log('Form submitted:', formObject)

    // Redirect to the next step
    router.push('/add-listing/2')
  }

  return (
    <>
      <Heading>Choosing listing categories</Heading>
      <Divider />

      {/* FORM */}
      <Form id="add-listing-form" action={handleSubmitForm} className="flex flex-col gap-y-8">
        {/* ITEM */}
        <FormItem label="Choose a property type" desccription="What type of property are you listing?">
          <Select name="propertyType">
            <option value="Apartment">Apartment</option>
            <option value="Hotel">Hotel</option>
            <option value="Cottage">Cottage</option>
            <option value="Villa">Villa</option>
            <option value="Cabin">Cabin</option>
            <option value="Farm stay">Farm stay</option>
            <option value="Houseboat">Houseboat</option>
            <option value="Lighthouse">Lighthouse</option>
          </Select>
        </FormItem>
        <FormItem label="Place name" desccription="What’s the name of your place?">
          <Input placeholder="Place name" name="place-name" />
        </FormItem>
        <FormItem label="Rental form" desccription="What type of rental is this?">
          <Select name="rentalForm">
            <option value="Hotel">Entire place</option>
            <option value="Private room">Private room</option>
            <option value="Share room">Share room</option>
          </Select>
        </FormItem>
      </Form>
    </>
  )
}

export default Page
