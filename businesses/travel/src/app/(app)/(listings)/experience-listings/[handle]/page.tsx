import ButtonPrimary from '@/components/button-primary'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/components/description-list'
import { Divider } from '@/components/divider'
import { Text } from '@/components/text'
import { getListingReviews } from '@/data/data'
import { getExperienceListingByHandle } from '@/data/listings'
import { CheckmarkCircle01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Metadata } from 'next'
import Form from 'next/form'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import DateInputPopover from '../../components/date-input-popover'
import GuestsInputPopover from '../../components/guests-input-popover'
import HeaderGallery from '../../components/header-gallery'
import { SectionFeaturedAmenities } from '../../components/section-featured-amenities'
import SectionHeader from '../../components/section-header'
import { SectionHeading } from '../../components/section-heading'
import SectionHost from '../../components/section-host'
import SectionListingReviews from '../../components/section-listing-reviews'
import SectionMap from '../../components/section-map'

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params
  const listing = await getExperienceListingByHandle(handle)

  if (!listing) {
    return {
      title: 'Listing not found',
      description: 'The listing you are looking for does not exist.',
    }
  }

  return {
    title: listing?.title,
    description: listing?.description,
  }
}

const Page = async ({ params }: { params: Promise<{ handle: string }> }) => {
  const { handle } = await params

  const listing = await getExperienceListingByHandle(handle)
  const reviews = await getListingReviews(handle)

  if (!listing?.id) {
    return redirect('/experience')
  }
  const {
    address,
    galleryImgs,
    listingCategory,
    price,
    reviewCount,
    reviewStart,
    title,
    host,
    amenities: featuredAmenities,
  } = listing

  // Server action to handle form submission
  const handleSubmitForm = async (formData: FormData) => {
    'use server'

    // Handle form submission logic here
    console.log('Form submitted with data:', Object.fromEntries(formData.entries()))
    // For example, you can redirect to a checkout page or process the booking
    redirect('/checkout')
  }
  //

  const renderSectionInfo = () => {
    // TODO: fetch from api or from listing data
    const thingsToDo = [
      {
        name: 'The Ritz London',
        time: '7:30 AM - 8:00 AM',
        description: 'Your friendly local London guide will meet you at The Ritz.',
        imageUrl: 'https://images.pexels.com/photos/7245327/pexels-photo-7245327.jpeg',
      },
      {
        name: 'Buckingham Palace',
        time: '10:30 AM - 12:15 PM',
        description:
          'Begin your tour strolling through Green Park to Buckingham Palace, where you can watch the iconic Changing of the Guard.',
        imageUrl: 'https://images.pexels.com/photos/31258524/pexels-photo-31258524.jpeg',
      },
      {
        name: 'Explore Westminster',
        time: '12:15 PM - 1:30 PM',
        description:
          'You will see Big Ben, the Houses of Parliament, Trafalgar Square, Whitehall, Parliament Square, Churchill’s WW2 Bunker & more!.',
        imageUrl: 'https://images.pexels.com/photos/24739934/pexels-photo-24739934.jpeg',
      },
      {
        name: 'Take the Underground to South Bank',
        time: '1:30 PM - 3:30 PM',
        description:
          "Explore Shakespeare's Globe, Borough Market, and The Shard. Please bring a contactless card for this journey.",
        imageUrl: 'https://images.pexels.com/photos/31404330/pexels-photo-31404330.jpeg',
      },
      {
        name: 'Discover London Bridge Area',
        time: '3:45 PM - 5:30 PM',
        description:
          "We'll see Potter film locations (Millennium Bridge), The Clink Prison, London Bridge, HMS Belfast, Tower Bridge, and the Tower of London.",
        imageUrl: 'https://images.pexels.com/photos/16725180/pexels-photo-16725180.jpeg',
      },
    ]

    return (
      <div className="listingSection__wrap">
        <SectionHeading>Description</SectionHeading>
        <div className="leading-relaxed text-muted-foreground">{listing.description}</div>
        <SectionHeading>What you’ll do</SectionHeading>
        <div className="flex flex-col gap-8">
          {thingsToDo.map((item, index) => (
            <div key={index} className="flex items-start gap-4 sm:items-center sm:gap-8">
              <div className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-xl">
                <Image fill src={item.imageUrl} alt="" className="object-cover shadow-inner" />
              </div>
              <div className="max-w-md text-sm/5 text-muted-foreground">
                <p>{item.time}</p>
                <p className="mt-2 font-medium text-foreground">{item.name}</p>
                <p className="mt-1">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderSectionIncludes = () => {
    // TODO: fetch from api or from listing data
    const includes_demo = [
      { name: 'Set Menu Lunch on boat' },
      { name: 'Express Bus From London' },
      { name: 'Mineral Water On Express Bus' },
      { name: 'Kayak or Bamboo Boat. Life Jacket.' },
      { name: 'Big Ben Entrance Ticket' },
      { name: 'English Speaking Tour Guide' },
    ]
    return (
      <div className="listingSection__wrap">
        <SectionHeading>Included in the price </SectionHeading>

        {/* 6 */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {includes_demo.map((item) => (
            <div key={item.name} className="flex items-center gap-x-3">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={24} className="mt-px shrink-0" />
              <span>{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderSidebarPriceAndForm = () => {
    return (
      <div className="listingSection__wrap rounded-2xl shadow-lg-for-card bg-card p-4 sm:p-6 2xl:p-7">
        {/* PRICE */}
        <div className="flex items-end text-2xl font-[540]">
          <span className="font-normal text-muted-foreground-lighter line-through">$611</span>
          <span className="mx-2">{price}</span>
          <span className="text-base font-normal text-muted-foreground"> / guest</span>
        </div>

        {/* FORM */}
        <Form action={handleSubmitForm} className="flex flex-col rounded-3xl border border-border" id="booking-form">
          <DateInputPopover className="z-11 flex-1" />
          <div className="w-full border-b border-border"></div>
          <GuestsInputPopover className="flex-1" />
        </Form>

        <DescriptionList>
          <DescriptionTerm>Fee & Taxes</DescriptionTerm>
          <DescriptionDetails className="sm:text-right">$1.00</DescriptionDetails>
          <DescriptionTerm className="font-medium sm:text-gray-900">Total</DescriptionTerm>
          <DescriptionDetails className="font-medium sm:text-right">$261.00</DescriptionDetails>
        </DescriptionList>

        {/* SUBMIT */}
        <div>
          <ButtonPrimary form="booking-form" type="submit" className="w-full sm:h-12">
            Reserve
          </ButtonPrimary>
          <Text className="mt-4 text-center text-sm text-muted-foreground">You won&apos;t be charged yet</Text>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/*  HEADER */}
      <HeaderGallery images={galleryImgs} gridType="grid4" />

      {/* MAIN */}
      <main className="mt-10 flex flex-col gap-8 lg:flex-row xl:gap-[8%]">
        {/* CONTENT */}
        <div className="flex w-full flex-col lg:w-3/5 xl:w-[59%]">
          <SectionHeader
            address={address}
            host={host}
            listingCategory={listingCategory}
            reviewCount={reviewCount}
            reviewStart={reviewStart}
            title={title}
          />

          <Divider className="my-8 xl:my-12" />

          <SectionFeaturedAmenities featuredAmenities={featuredAmenities} />

          <Divider className="my-8 xl:my-12" />

          {renderSectionInfo()}

          <Divider className="my-8 xl:my-12" />

          {renderSectionIncludes()}
        </div>

        {/* SIDEBAR */}
        <div className="grow">
          <div className="sticky top-10">{renderSidebarPriceAndForm()}</div>
        </div>
      </main>

      <Divider className="my-10 xl:my-16" />

      <div className="flex flex-col gap-8 lg:flex-row lg:gap-10 xl:gap-16">
        <div className="w-full lg:w-4/9 xl:w-1/3">
          <SectionHost {...host} />
        </div>
        <div className="w-full lg:w-2/3">
          <SectionListingReviews reviewCount={reviewCount} reviewStart={reviewStart} reviews={reviews} />
        </div>
      </div>

      <Divider className="my-10 xl:my-16" />

      <SectionMap location={{ ...listing.map, id: 1, name: title }} />

      {/* <Divider className="my-10 xl:my-16" /> */}

      {/* <SectionThingsToKnow /> */}
    </div>
  )
}

export default Page
