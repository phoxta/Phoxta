import newsletterSectionBg from '@/assets/images/news-letter-bg.webp'
import Img from '@/components/media/img'
import { ButtonCircle } from '@/components/primitives/button'
import { Heading } from '@/components/primitives/heading'
import { Text } from '@/components/primitives/text'
import AppLink from '@/lib/nav/link'
import { ArrowUpRightIcon, CheckIcon } from '@heroicons/react/24/outline'
import { useState, type FormEvent } from 'react'

interface NewsletterProps {
  className?: string
}

export default function NewsletterSection({ className = '' }: NewsletterProps) {
  // There is no newsletter backend; submitting acknowledges in place by swapping the
  // arrow for a check so the form does not reload the page or silently do nothing.
  const [sent, setSent] = useState(false)

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSent(true)
  }

  return (
    <div className={className}>
      <div className="relative overflow-hidden rounded-2xl p-4 md:p-10 lg:p-14">
        <Img src={newsletterSectionBg} className="-z-10 object-cover" fill alt="cover" />
        <div className="absolute inset-0 -z-10 bg-linear-to-b from-white/20 to-transparent"></div>

        <div className="flex flex-col justify-between gap-24 text-neutral-900 lg:gap-40 xl:gap-60">
          <div className="max-w-2xl">
            <Heading>
              Want product news and updates? <span data-slot="italic">Sign up</span> for our newsletter.
            </Heading>
          </div>

          <form className="w-full max-w-md" onSubmit={handleSubmit}>
            <div className="flex gap-x-0.5">
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                required
                placeholder="Enter your email"
                autoComplete="email"
                className="min-w-0 flex-auto rounded-full border-white bg-white px-4 py-2 text-sm/6 text-zinc-900 placeholder:text-zinc-600 sm:px-6"
              />
              <ButtonCircle type="submit" color="white" className="border-white!">
                {sent ? <CheckIcon className="size-4!" /> : <ArrowUpRightIcon className="size-4! rtl:-rotate-90" />}
              </ButtonCircle>
            </div>
            <div className="mt-4 pl-1.5">
              <Text className="text-xs">
                We care about your data. Read our{' '}
                <AppLink href="#" className="underline">
                  privacy&nbsp;policy
                </AppLink>
                .
              </Text>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
