'use client'

import ButtonPrimary from '@/components/button-primary'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/components/description-list'
import { Divider } from '@/components/divider'
import { Heading } from '@/components/heading'
import StartRating from '@/components/start-rating'
import { Calendar04Icon, Home02FreeIcons, UserIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Image from 'next/image'
import React from 'react'

const Page = () => {
  React.useEffect(() => {
    document.documentElement.scrollTo({
      top: 0,
      behavior: 'instant',
    })
  }, [])

  return (
    <main className="container mt-10 mb-24 sm:mt-14 lg:mb-32">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-y-12">
        <Heading level={1}>
          Congratulation <span data-slot="italic"> 🎉</span>
        </Heading>

        <Divider />

        <div>
          <h3 className="text-2xl font-medium">Your booking</h3>
          <div className="mt-5 flex flex-col sm:flex-row sm:items-center">
            <div className="w-full shrink-0 sm:w-40">
              <div className="aspect-w-4 overflow-hidden rounded-2xl aspect-h-3 sm:aspect-h-4">
                <Image
                  fill
                  alt=""
                  className="object-cover"
                  src="https://images.pexels.com/photos/14475292/pexels-photo-14475292.jpeg"
                  sizes="200px"
                  priority
                />
              </div>
            </div>
            <div className="flex flex-col gap-y-3 pt-5 sm:px-5 sm:pb-5">
              <div>
                <span className="line-clamp-1 text-sm text-neutral-500 dark:text-neutral-400">
                  Hotel room in Tokyo, Jappan
                </span>
                <span className="mt-1 block text-base font-medium sm:text-lg">The Lounge & Bar</span>
              </div>
              <span className="block text-sm text-neutral-500 dark:text-neutral-400">2 beds · 2 baths</span>
              <Divider className="w-10!" />

              <StartRating />
            </div>
          </div>
        </div>

        <div className="flex flex-col divide-y divide-border rounded-3xl border border-border bg-card sm:flex-row sm:divide-x sm:divide-y-0">
          <div className="flex flex-1 gap-x-4 p-5">
            <HugeiconsIcon
              className="text-muted-foreground-lighter"
              icon={Calendar04Icon}
              size={32}
              strokeWidth={1.5}
            />
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Date</span>
              <span className="mt-1 text-lg font-medium text-foreground">Aug 12 - 16, 2025</span>
            </div>
          </div>
          <div className="flex flex-1 gap-x-4 p-5">
            <HugeiconsIcon className="text-muted-foreground-lighter" icon={UserIcon} size={32} strokeWidth={1.5} />
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Guests</span>
              <span className="mt-1 text-lg font-medium text-foreground">3 Guests</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-2xl font-medium">Booking detail</h3>
          <DescriptionList className="mt-5">
            <DescriptionTerm>Booking code</DescriptionTerm>
            <DescriptionDetails>#222-333-111</DescriptionDetails>
            <DescriptionTerm>Date</DescriptionTerm>
            <DescriptionDetails>12 Aug, 2021</DescriptionDetails>
            <DescriptionTerm>Total</DescriptionTerm>
            <DescriptionDetails>$199</DescriptionDetails>
            <DescriptionTerm>Payment method</DescriptionTerm>
            <DescriptionDetails>Credit card</DescriptionDetails>
          </DescriptionList>
        </div>

        <div>
          <ButtonPrimary href="/">
            <HugeiconsIcon icon={Home02FreeIcons} className="size-6" />
            Explore more listings
          </ButtonPrimary>
        </div>
      </div>
    </main>
  )
}

export default Page
