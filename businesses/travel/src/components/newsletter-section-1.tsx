import newsletterSectionBg from '@/images/news-letter-bg.webp'

import { ArrowUpRightIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'
import Link from 'next/link'
import { ButtonCircle } from './button'
import { Heading } from './heading'
import { Text } from './text'

interface NewsletterProps {
  className?: string
}

export default function NewsletterSection({ className = '' }: NewsletterProps) {
  return (
    <div className={className}>
      <div className="relative overflow-hidden rounded-2xl p-4 md:p-10 lg:p-14">
        <Image src={newsletterSectionBg} className="-z-10 object-cover" fill alt="cover" />
        <div className="absolute inset-0 -z-10 bg-linear-to-b from-white/20 to-transparent"></div>

        <div className="flex flex-col justify-between gap-24 text-neutral-900 lg:gap-40 xl:gap-60">
          <div className="max-w-2xl">
            <Heading>
              Want product news and updates? <span data-slot="italic">Sign up</span> for our newsletter.
            </Heading>
          </div>

          <form className="w-full max-w-md">
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
              <ButtonCircle color="white" className="border-white!">
                <ArrowUpRightIcon className="size-4! rtl:-rotate-90" />
              </ButtonCircle>
            </div>
            <div className="mt-4 pl-1.5">
              <Text className="text-xs">
                We care about your data. Read our{' '}
                <Link href="#" className="underline">
                  privacy&nbsp;policy
                </Link>
                .
              </Text>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
