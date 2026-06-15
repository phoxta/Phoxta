import ButtonPrimary from '@/components/button-primary'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/components/description-list'
import { Divider } from '@/components/divider'
import NcInputNumber from '@/components/nc-input-number'
import { Text } from '@/components/text'
import { getListingReviews } from '@/data/data'
import { getCarListingByHandle } from '@/data/listings'
import {
  CheckmarkCircle01Icon,
  DollarCircleIcon,
  IdentityCardIcon,
  SchoolReportCardIcon,
  TicketIcon,
  UserCircleIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Metadata } from 'next'
import Form from 'next/form'
import { redirect } from 'next/navigation'
import DatesRangeInputPopover from '../../components/dates-range-input-popover'
import HeaderGallery from '../../components/header-gallery'
import { SectionFeaturedAmenities } from '../../components/section-featured-amenities'
import SectionHeader from '../../components/section-header'
import { SectionHeading } from '../../components/section-heading'
import SectionHost from '../../components/section-host'
import SectionListingReviews from '../../components/section-listing-reviews'
import SectionMap from '../../components/section-map'

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params
  const listing = await getCarListingByHandle(handle)

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

  const listing = await getCarListingByHandle(handle)
  const reviews = await getListingReviews(handle)

  if (!listing?.id) {
    return redirect('/car')
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

  const renderSectionChecklist = () => {
    // TODO: fetch from api or from listing data
    const checklists = [
      {
        name: "Policy on driver's age",
        description:
          'The minimum age to drive this car is 25. Please ensure the driver meets this requirement before booking.',
        icon: UserCircleIcon,
      },
      {
        name: 'ID type',
        description: 'Bring your Valid passport or ID card.',
        icon: IdentityCardIcon,
      },
      {
        name: 'Driving licence',
        description:
          'During pick-up, all drivers must provide any one of the license combinations listed below. If not, the booking will be canceled without a refund.',
        icon: SchoolReportCardIcon,
      },
      {
        name: 'Deposit payment',
        description:
          'A deposit of $1,000 is required at pick-up. This will be refunded within 5–10 business days after the car is returned undamaged.',
        icon: DollarCircleIcon,
      },
      {
        name: 'Vouchers',
        description: 'Bring your booking voucher (printed or digital) and a valid photo ID.',
        icon: TicketIcon,
      },
    ]

    return (
      <div className="listingSection__wrap">
        <SectionHeading>Important info</SectionHeading>
        <div className="flex flex-col gap-8">
          {checklists.map((item, index) => (
            <div key={index} className="flex items-start gap-4 sm:gap-8">
              <HugeiconsIcon icon={item.icon} size={24} className="shrink-0" />
              <div className="max-w-md text-sm/5 text-muted-foreground">
                {/* <p>{item.time}</p> */}
                <p className="font-medium text-foreground">{item.name}</p>
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
      { name: 'Free cancellation up to 48 hours' },
      { name: 'Collision Damage Waiver with $214 deductible' },
      { name: 'Theft Protection with $19,999 excess' },
      { name: 'Unlimited mileage' },
      { name: 'Car interiors and exteriors cleaned with disinfectant before pick-up' },
      { name: 'Masks are required at the pick-up location' },
      { name: '24/7 roadside assistance' },
      { name: 'Free Wi-Fi in the car' },
      { name: 'GPS navigation system included' },
      { name: 'Child safety seat available upon request' },
    ]
    return (
      <div className="listingSection__wrap">
        <SectionHeading>Included in the price </SectionHeading>

        {/* 6 */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {includes_demo.map((item) => (
            <div key={item.name} className="flex items-center gap-x-3 text-sm">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={24} className="mt-px shrink-0" />
              <span>{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderSectionPickUpAndDropOff = () => {
    return (
      <div className="listingSection__wrap">
        <SectionHeading>Pick up and drop off </SectionHeading>
        <div className="flex gap-x-4">
          <div className="flex shrink-0 flex-col items-center py-2">
            <span className="block size-6 rounded-full border border-border shadow-xl"></span>
            <span className="my-1 block grow border-l border-dashed border-border"></span>
            <span className="block size-6 rounded-full border border-border shadow-xl"></span>
          </div>
          <div className="flex flex-col gap-y-14 text-sm">
            <div>
              <p>Tue, Mar 24, 12:00pm</p>
              <p className="mt-2 font-medium">Haneda Airport store</p>
            </div>
            <div>
              <p>Tue, Mar 31, 12:00pm</p>
              <p className="mt-2 font-medium">Haneda Airport store</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderSectionPolicy = () => {
    return (
      <div className="listingSection__wrap">
        <SectionHeading>Rental policies</SectionHeading>
        <DescriptionList>
          <DescriptionTerm>Cancellation policy</DescriptionTerm>
          <DescriptionDetails>
            You will not be charged anything for the rental since the booking was risk-free.
          </DescriptionDetails>

          <DescriptionTerm>Age surcharge</DescriptionTerm>
          <DescriptionDetails>Drivers under 25 will be charged an additional $15.00 per day.</DescriptionDetails>

          <DescriptionTerm>Deposit after exchange rate</DescriptionTerm>
          <DescriptionDetails>US$1,000.00 &rarr; CA$1,331.93</DescriptionDetails>

          <DescriptionTerm>Fee</DescriptionTerm>
          <DescriptionDetails>$4.79 USD</DescriptionDetails>

          <DescriptionTerm>Net</DescriptionTerm>
          <DescriptionDetails>$1,955.00</DescriptionDetails>
        </DescriptionList>
      </div>
    )
  }

  const renderSidebarPriceAndForm = () => {
    return (
      <div className="listingSection__wrap rounded-2xl shadow-lg-for-card bg-card p-4 sm:p-6 2xl:p-7">
        {/* PRICE */}
        <div className="flex items-end text-2xl font-[540]">
          <span className="font-normal text-muted-foreground-lighter line-through">$599</span>
          <span className="mx-2">{price}</span>
          <span className="text-base font-normal text-muted-foreground"> / day</span>
        </div>

        {/* FORM */}
        <Form action={handleSubmitForm} className="flex flex-col" id="booking-form">
          <div className="rounded-3xl border border-border">
            <DatesRangeInputPopover btnClassName="rounded-3xl" inputDescription="Pick-up / Drop-off" />
          </div>
          <div className="mt-6">
            <NcInputNumber
              className="w-full"
              defaultValue={0}
              inputName="childSeat"
              max={10}
              min={1}
              label={'Child seat'}
              description={'$21.00 / day'}
            />
            <NcInputNumber
              className="mt-6 w-full"
              defaultValue={0}
              inputName="gps"
              max={4}
              label={'GPS'}
              description={'$10.00 / day'}
            />

            <NcInputNumber
              className="mt-6 w-full"
              defaultValue={0}
              inputName="additionalDriver"
              max={4}
              label={'Additional driver'}
              description={'$10.00 / day'}
            />
          </div>
        </Form>

        <Divider />

        {/* SUBMIT */}
        <div>
          <DescriptionList>
            <DescriptionTerm className="font-medium sm:text-gray-900">Total</DescriptionTerm>
            <DescriptionDetails className="font-medium sm:text-right">$261.00</DescriptionDetails>
          </DescriptionList>
          <ButtonPrimary form="booking-form" type="submit" className="mt-5 w-full sm:h-12">
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
          {renderSectionIncludes()}
          <Divider className="my-8 xl:my-12" />
          {renderSectionPickUpAndDropOff()}
          <Divider className="my-8 xl:my-12" />
          {renderSectionChecklist()}
          <Divider className="my-8 xl:my-12" />
          {renderSectionPolicy()}
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
