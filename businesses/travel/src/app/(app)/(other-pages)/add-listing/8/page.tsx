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
    router.prefetch('/add-listing/9')
  }, [router])

  const handleSubmitForm = async (formData: FormData) => {
    const formObject = Object.fromEntries(formData.entries())
    // Handle form submission logic here
    console.log('Form submitted:', formObject)

    // Redirect to the next step
    router.push('/add-listing/9')
  }

  return (
    <>
      <div>
        <Heading>Price your space</Heading>
        <span className="mt-2 block text-muted-foreground">
          The host&lsquo;s revenue is directly dependent on the setting of rates and regulations on the number of
          guests, the number of nights, and the cancellation policy.
        </span>
      </div>

      <Divider />
      {/* FORM */}
      <Form id="add-listing-form" action={handleSubmitForm} className="space-y-8">
        {/* ITEM */}
        <FormItem label="Currency">
          <Select name="currency">
            <option value="USD">USD</option>
            <option value="VND">VND</option>
            <option value="EURRO">EURRO</option>
          </Select>
        </FormItem>
        <FormItem label="Base price (Monday -Thuday)">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
              <span className="text-sm text-muted-foreground">$</span>
            </div>
            <Input name="base-price1" className="ps-8! pe-10!" placeholder="0.00" />
            <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3">
              <span className="text-sm text-muted-foreground">USD</span>
            </div>
          </div>
        </FormItem>
        {/* ----- */}
        <FormItem label="Base price (Friday-Sunday)">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
              <span className="text-sm text-muted-foreground">$</span>
            </div>
            <Input name="base-price2" className="ps-8! pe-10!" placeholder="0.00" />
            <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3">
              <span className="text-sm text-muted-foreground">USD</span>
            </div>
          </div>
        </FormItem>
        {/* ----- */}
        <FormItem label="Long term price (Monthly discount)">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <Input name="long-price3" className="ps-8! pe-10!" placeholder="0.00" />
            <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3">
              <span className="text-sm text-muted-foreground">every month</span>
            </div>
          </div>
        </FormItem>
      </Form>
    </>
  )
}

export default Page
