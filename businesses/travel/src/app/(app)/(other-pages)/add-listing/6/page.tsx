'use client'

import { Heading } from '@/components/heading'
import Textarea from '@/components/textarea'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const PageAddListing6 = () => {
  const router = useRouter()

  // Prefetch the next step to improve performance
  useEffect(() => {
    router.prefetch('/add-listing/7')
  }, [router])

  const handleSubmitForm = async (formData: FormData) => {
    const formObject = Object.fromEntries(formData.entries())
    // Handle form submission logic here
    console.log('Form submitted:', formObject)

    // Redirect to the next step
    router.push('/add-listing/7')
  }

  return (
    <>
      <div>
        <Heading>Your place description</Heading>
        <span className="mt-2 block text-neutral-500 dark:text-neutral-400">
          Mention the best features of your accommodation, any special amenities like fast Wi-Fi or parking, as well as
          things you like about the neighborhood.
        </span>
      </div>

      <Form id="add-listing-form" action={handleSubmitForm}>
        <Textarea name="place-description" placeholder="..." rows={14} />
      </Form>
    </>
  )
}

export default PageAddListing6
