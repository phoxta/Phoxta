import ButtonPrimary from '@/components/button-primary'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/components/description-list'
import { Divider } from '@/components/divider'
import { Text } from '@/components/text'
import { getListingReviews } from '@/data/data'
import { getStayListingByHandle } from '@/data/listings'
import { Metadata } from 'next'
import Form from 'next/form'
import { redirect } from 'next/navigation'
import { Fragment } from 'react'
import DatesRangeInputPopover from '../../components/dates-range-input-popover'
import GuestsInputPopover from '../../components/guests-input-popover'
import HeaderGallery from '../../components/header-gallery'
import SectionAmenities from '../../components/section-amenities'
import SectionDateRange from '../../components/section-date-range'
import { SectionFeaturedAmenities } from '../../components/section-featured-amenities'
import SectionHeader from '../../components/section-header'
import { SectionHeading, SectionSubheading } from '../../components/section-heading'
import SectionHost from '../../components/section-host'
import SectionListingReviews from '../../components/section-listing-reviews'
import SectionMap from '../../components/section-map'

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params
  const listing = await getStayListingByHandle(handle)

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

  const listing = await getStayListingByHandle(handle)
  const reviews = await getListingReviews(handle)

  if (!listing?.id) {
    return redirect('/')
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
    fullAmenities,
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
    return (
      <div className="listingSection__wrap">
        <SectionHeading>Stay information</SectionHeading>
        <div className="leading-relaxed text-gray-700 dark:text-gray-300">
          <span>
            Providing lake views, The Symphony 9 Tam Coc in Ninh Binh provides accommodation, an outdoor swimming pool,
            a bar, a shared lounge, a garden and barbecue facilities. Complimentary WiFi is provided.
          </span>
          <br />
          <br />
          <span>There is a private bathroom with bidet in all units, along with a hairdryer and free toiletries.</span>
          <br /> <br />
          <span>
            The Symphony 9 Tam Coc offers a terrace. Both a bicycle rental service and a car rental service are
            available at the accommodation, while cycling can be enjoyed nearby.
          </span>
        </div>
      </div>
    )
  }

  const renderSectionRoomRates = () => {
    const roomRates = [
      {
        name: 'monday-thursday',
        title: 'Monday - Thursday',
        price: '$199',
      },
      {
        name: 'friday-sunday',
        title: 'Friday - Sunday',
        price: '$219',
      },
      {
        name: 'rent-by-month',
        title: 'Rent by month',
        price: '-8.34 %',
      },
      {
        name: 'minimum-nights',
        title: 'Minimum number of nights',
        price: '1 night',
      },
      {
        name: 'maximum-nights',
        title: 'Max number of nights',
        price: '90 nights',
      },
    ]
    return (
      <div className="listingSection__wrap">
        <div>
          <SectionHeading>Room Rates </SectionHeading>
          <SectionSubheading>Prices may increase on weekends or holidays</SectionSubheading>
        </div>
        <DescriptionList>
          {roomRates.map((item) => (
            <Fragment key={item.name}>
              <DescriptionTerm>{item.title}</DescriptionTerm>
              <DescriptionDetails>{item.price}</DescriptionDetails>
            </Fragment>
          ))}
        </DescriptionList>
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
          <span className="text-base font-normal text-muted-foreground"> for 3 nights</span>
        </div>

        {/* FORM */}
        <Form action={handleSubmitForm} className="flex flex-col rounded-3xl border border-border" id="booking-form">
          <DatesRangeInputPopover className="z-11 flex-1" />
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
      <HeaderGallery images={galleryImgs} gridType="grid2" />

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

          <SectionAmenities amenities={fullAmenities} />

          <Divider className="my-8 xl:my-12" />

          <SectionDateRange />
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
    </div>
  )
}

export default Page
