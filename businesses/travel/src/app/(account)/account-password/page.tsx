import ButtonPrimary from '@/components/button-primary'
import { Divider } from '@/components/divider'
import { Field, Label } from '@/components/fieldset'
import { Heading } from '@/components/heading'
import Input from '@/components/input'
import { Metadata } from 'next'
import Form from 'next/form'

export const metadata: Metadata = {
  title: 'Account - password',
  description: 'Manage your password',
}

const Page = () => {
  const handleSubmitForm = async (formData: FormData) => {
    'use server'
    // Handle form submission logic here
    console.log('Form submitted:', Object.fromEntries(formData.entries()))
  }

  return (
    <div>
      {/* HEADING */}
      <Heading level={1}>
        Update your <span data-slot="italic">password</span>
      </Heading>

      <Divider className="my-8 w-14!" />

      <Form action={handleSubmitForm} className="max-w-xl space-y-6">
        <Field>
          <Label>Current password</Label>
          <Input type="password" className="mt-1.5" />
        </Field>
        <Field>
          <Label>New password</Label>
          <Input type="password" className="mt-1.5" />
        </Field>
        <Field>
          <Label>Confirm password</Label>
          <Input type="password" className="mt-1.5" />
        </Field>
        <div className="pt-4">
          <ButtonPrimary type="submit">Update password</ButtonPrimary>
        </div>
      </Form>
    </div>
  )
}

export default Page
