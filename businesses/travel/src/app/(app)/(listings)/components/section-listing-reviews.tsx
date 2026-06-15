'use client'

import { Button } from '@/components/button'
import ButtonCircle from '@/components/button-circle'
import { Dialog, DialogBody, DialogTitle } from '@/components/dialog'
import { Divider } from '@/components/divider'
import Input from '@/components/input'
import ListingReview from '@/components/listing-review'
import { TListingReivew } from '@/data/data'
import { ArrowRightIcon, StarIcon } from '@heroicons/react/24/solid'
import clsx from 'clsx'
import { useState } from 'react'
import { SectionHeading } from './section-heading'

interface Props {
  reviewCount: number
  reviewStart: number
  reviews: TListingReivew[]
}

const SectionListingReviews = ({ reviews, reviewCount, reviewStart }: Props) => {
  let [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <div className="flex flex-col gap-y-6 sm:gap-y-8">
        {/* HEADING */}
        <div>
          <SectionHeading>Reviews ({reviewCount} reviews) </SectionHeading>
          <div className="mt-4 flex items-center">
            {[0, 1, 2, 3, 4].map((number) => (
              <StarIcon
                key={number}
                aria-hidden="true"
                className={clsx(
                  reviewStart > number ? 'text-gray-900 dark:text-white' : 'text-gray-200 dark:text-gray-500',
                  'size-6 shrink-0'
                )}
              />
            ))}
          </div>
        </div>

        <Divider className="w-14!" />

        {/* Content */}
        <div className="relative">
          <Input
            sizeClass="h-16 px-6 py-3"
            fontClass="text-base/6"
            rounded="rounded-full"
            placeholder="Share your thoughts ..."
          />
          <div className="absolute end-2 top-1/2 -translate-y-1/2">
            <ButtonCircle className="size-12!">
              <ArrowRightIcon className="size-5 rtl:rotate-180" />
            </ButtonCircle>
          </div>
        </div>

        {/* comment */}
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {reviews.slice(0, 3).map((item, index) => (
            <ListingReview key={index} className="py-7" reivew={item} />
          ))}
          <Button className="mt-8" outline onClick={() => setIsOpen(true)}>
            Show all {reviewCount} reviews
          </Button>
        </div>
      </div>

      <Dialog size="2xl" open={isOpen} onClose={setIsOpen}>
        <DialogTitle>{reviewCount} reviews</DialogTitle>

        <DialogBody>
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {reviews.map((item, index) => (
              <ListingReview key={index} className="py-7" reivew={item} />
            ))}
          </div>
        </DialogBody>
      </Dialog>
    </>
  )
}

export default SectionListingReviews
