import ButtonPrimary from '@/components/button-primary'
import { Divider } from '@/components/divider'
import { Heading } from '@/components/heading'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Account - Payments & Payouts',
  description: 'Manage your payments and payouts ',
}

const AccountBilling = () => {
  return (
    <div>
      {/* HEADING */}
      <Heading level={1}>
        Payments & <span data-slot="italic">payouts</span>{' '}
      </Heading>

      <Divider className="my-8 w-14!" />

      <div className="max-w-2xl">
        <span className="block text-xl font-semibold">Payout methods</span>
        <br />
        <span className="block text-neutral-700 dark:text-neutral-300">
          {` When you receive a payment for a reservation, we call that payment
              to you a "payout." Our secure payment system supports several
              payout methods, which can be set up below. Go to FAQ.`}
          <br />
          <br />
          To get paid, you need to set up a payout method Airbnb releases payouts about 24 hours after a guest’s
          scheduled check-in time. The time it takes for the funds to appear in your account depends on your payout
          method. Learn more
        </span>
        <div className="pt-10">
          <ButtonPrimary>Add payout method</ButtonPrimary>
        </div>
      </div>
    </div>
  )
}

export default AccountBilling
