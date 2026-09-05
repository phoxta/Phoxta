import { useEffect } from 'react'
import Img from '@/components/media/img'
import StartRating from '@/components/cards/start-rating'
import ButtonPrimary from '@/components/primitives/button-primary'
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
} from '@/components/primitives/description-list'
import { Divider } from '@/components/primitives/divider'
import { Heading } from '@/components/primitives/heading'
import QueryForm from '@/lib/nav/form'
import { useRouter } from '@/lib/nav/navigation'
import PayWith from '@/routes/pages/checkout-pay-with'
import YourTrip from '@/routes/pages/checkout-your-trip'

export default function CheckoutPage() {
  const router = useRouter()

  useEffect(() => {
    document.documentElement.scrollTo({
      top: 0,
      behavior: 'instant',
    })
  }, [])

  // No payment backend behind this screen: submitting takes the guest to the
  // confirmation page, which is what the button has always promised.
  const handleSubmitForm = () => {
    router.push('/pay-done')
  }

  const renderSidebar = () => {
    return (
      <div className="sticky top-8 flex w-full flex-col gap-y-6 rounded-3xl shadow-lg-for-card bg-card p-4 sm:gap-y-8 sm:p-6 xl:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center">
          <div className="w-full shrink-0 sm:w-40">
            <div className="aspect-w-4 relative aspect-h-3 sm:aspect-h-4">
              <Img
                alt=""
                className="rounded-2xl object-cover"
                fill
                sizes="200px"
                src="/images/catalog/14475292-1200.webp"
              />
            </div>
          </div>
          <div className="flex flex-col gap-y-3 py-5 text-start sm:ps-5">
            <div>
              <span className="line-clamp-1 text-sm text-neutral-500 dark:text-neutral-400">
                Hotel room in Tokyo, Jappan
              </span>
              <span className="mt-1 block text-base font-medium">The Lounge & Bar</span>
            </div>
            <p className="block text-sm text-neutral-500 dark:text-neutral-400">2 beds · 2 baths</p>
            <Divider className="w-10!" />
            <StartRating />
          </div>
        </div>

        <Divider className="block lg:hidden" />

        <DescriptionList>
          <DescriptionTerm>£19.00 x 3 day</DescriptionTerm>
          <DescriptionDetails className="sm:text-right">£57.00</DescriptionDetails>
          <DescriptionTerm>Service charge</DescriptionTerm>
          <DescriptionDetails className="sm:text-right">£0.00</DescriptionDetails>
          <DescriptionTerm>Fee</DescriptionTerm>
          <DescriptionDetails className="sm:text-right">£0.00</DescriptionDetails>
          <DescriptionTerm>Tax</DescriptionTerm>
          <DescriptionDetails className="sm:text-right">£0.00</DescriptionDetails>
          <DescriptionTerm className="font-semibold text-neutral-900">Total</DescriptionTerm>
          <DescriptionDetails className="font-semibold sm:text-right">£57.00</DescriptionDetails>
        </DescriptionList>
      </div>
    )
  }

  const renderMain = () => {
    return (
      <QueryForm action={handleSubmitForm} className="flex w-full flex-col gap-y-8">
        <Heading level={1}>
          Confirm and <span data-slot="italic">payment</span>
        </Heading>
        <Divider />
        <YourTrip />
        <PayWith />
        <div>
          <ButtonPrimary type="submit" className="text-base/6! lg:mt-5 xl:mt-10">
            Confirm and pay
          </ButtonPrimary>
        </div>
      </QueryForm>
    )
  }

  return (
    <main className="container mt-10 mb-24 flex max-w-7xl flex-col gap-14 sm:mt-14 lg:mb-32 lg:flex-row lg:gap-16">
      <div className="w-full lg:w-3/5 xl:w-2/3">{renderMain()}</div>
      <Divider className="block lg:hidden" />
      <div className="grow">{renderSidebar()}</div>
    </main>
  )
}
