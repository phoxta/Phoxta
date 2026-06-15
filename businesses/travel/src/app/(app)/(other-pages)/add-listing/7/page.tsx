'use client'

import { Divider } from '@/components/divider'
import { Heading } from '@/components/heading'
import { ImageAdd02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const Page = () => {
  const router = useRouter()

  // Prefetch the next step to improve performance
  useEffect(() => {
    router.prefetch('/add-listing/8')
  }, [router])

  const handleSubmitForm = async (formData: FormData) => {
    const formObject = Object.fromEntries(formData.entries())
    // Handle form submission logic here
    console.log('Form submitted:', formObject)

    // Redirect to the next step
    router.push('/add-listing/8')
  }

  return (
    <>
      <div>
        <Heading>Add photos of your place</Heading>
        <span className="mt-2 block text-neutral-500 dark:text-neutral-400">
          A few beautiful photos will help customers have more sympathy for your property.
        </span>
      </div>

      <Divider />
      {/* FORM */}
      <Form id="add-listing-form" action={handleSubmitForm} className="space-y-8">
        <div>
          <span className="text-lg font-medium">Cover image</span>
          <div className="mt-5">
            <div className="mt-1 flex justify-center rounded-2xl border-2 border-dashed border-border bg-card px-6 pt-5 pb-6">
              <div className="space-y-1 text-center">
                <HugeiconsIcon className="mx-auto text-neutral-400" icon={ImageAdd02Icon} size={48} strokeWidth={1} />

                <div className="flex text-sm text-muted-foreground">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer rounded-md font-medium text-primary focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:outline-hidden hover:text-primary"
                  >
                    <span>Upload a file</span>
                    <input id="file-upload" name="cover" type="file" className="sr-only" />
                  </label>
                  <p className="ps-1">or drag and drop</p>
                </div>
                <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 10MB</p>
              </div>
            </div>
          </div>
        </div>
        {/* ----------------- */}
        <div>
          <span className="text-lg font-medium">Pictures of the place</span>
          <div className="mt-5">
            <div className="mt-1 flex justify-center rounded-2xl border-2 border-dashed border-border bg-card px-6 pt-5 pb-6">
              <div className="space-y-1 text-center">
                <HugeiconsIcon className="mx-auto text-neutral-400" icon={ImageAdd02Icon} size={48} strokeWidth={1} />

                <div className="flex text-sm text-muted-foreground">
                  <label
                    htmlFor="file-upload-2"
                    className="relative cursor-pointer rounded-md font-medium text-primary focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:outline-hidden hover:text-primary"
                  >
                    <span>Upload a file</span>
                    <input id="file-upload-2" name="gallery" type="file" className="sr-only" />
                  </label>
                  <p className="ps-1">or drag and drop</p>
                </div>
                <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 10MB</p>
              </div>
            </div>
          </div>
        </div>
      </Form>
    </>
  )
}

export default Page
