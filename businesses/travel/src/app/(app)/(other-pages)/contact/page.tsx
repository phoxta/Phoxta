import ButtonPrimary from '@/components/button-primary'
import { Field, Label } from '@/components/fieldset'
import { Heading } from '@/components/heading'
import Input from '@/components/input'
import NewsletterSection from '@/components/newsletter-section-1'
import SocialsList from '@/components/socials-list'
import Textarea from '@/components/textarea'
import { SentIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Metadata } from 'next'

const info = [
  {
    title: 'ADDRESS',
    description: 'Phra Khanong, Bangkok, Thailand',
  },
  {
    title: 'EMAIL',
    description: 'example@example.com',
  },
  {
    title: 'PHONE',
    description: '000-123-456-7890',
  },
]

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Explore contact us page',
}

const PageContact = () => {
  return (
    <div className="pt-10 pb-24 sm:py-24 lg:py-32">
      <div className="container mx-auto max-w-6xl">
        <div className="grid shrink-0 grid-cols-1 gap-x-5 gap-y-12 sm:grid-cols-2">
          <div>
            <Heading level={1} bigger>
              Contact <span data-slot="italic">Us</span>
            </Heading>
            <div className="mt-10 flex max-w-sm flex-col gap-y-8 sm:mt-20">
              {info.map((item, index) => (
                <div key={index}>
                  <h3 className="text-sm font-medium tracking-wider uppercase dark:text-neutral-200">{item.title}</h3>
                  <span className="mt-2 block text-muted-foreground">{item.description}</span>
                </div>
              ))}
              <div>
                <h3 className="text-sm font-medium tracking-wider uppercase dark:text-neutral-200">SOCIALS</h3>
                <SocialsList className="mt-2" />
              </div>
            </div>
          </div>
          <form className="grid grid-cols-1 gap-6" action="#" method="post">
            <Field className="block">
              <Label>Full name</Label>
              <Input placeholder="Example Doe" type="text" className="mt-1" />
            </Field>
            <Field className="block">
              <Label>Email address</Label>
              <Input type="email" placeholder="example@example.com" className="mt-1" />
            </Field>
            <Field className="block">
              <Label>Message</Label>
              <Textarea className="mt-1" rows={6} />
            </Field>
            <div>
              <ButtonPrimary type="submit">
                Send Message
                <HugeiconsIcon icon={SentIcon} size={16} />
              </ButtonPrimary>
            </div>
          </form>
        </div>
      </div>

      {/* OTHER SECTIONS */}
      <div className="container mt-20 lg:mt-32">
        <NewsletterSection />
      </div>
    </div>
  )
}

export default PageContact
