import { CalendarRemove01Icon, CircleLock02Icon, SecurityWarningIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { SectionHeading } from './section-heading'

const SectionThingsToKnow = () => {
  return (
    <div className="listingSection__wrap">
      <SectionHeading className="text-2xl font-semibold">Things to know</SectionHeading>

      <div className="grid gap-10 text-sm text-gray-700 sm:grid-cols-2 lg:grid-cols-3 dark:text-gray-300">
        <div>
          <HugeiconsIcon icon={CircleLock02Icon} size={24} />
          <h3 className="mt-5 font-medium">House rules</h3>
          <ul className="mt-1 text-gray-500 dark:text-gray-400">
            <li>No smoking</li>
            <li>No pets</li>
            <li>No parties or events</li>
          </ul>
        </div>
        <div>
          <HugeiconsIcon icon={SecurityWarningIcon} size={24} />
          <h3 className="mt-5 font-medium">Health & safety</h3>
          <ul className="mt-1 text-gray-500 dark:text-gray-400">
            <li>Air conditioning</li>
            <li>Carbon monoxide alarm</li>
            <li>Smoke alarm</li>
          </ul>
        </div>
        <div>
          <HugeiconsIcon icon={CalendarRemove01Icon} size={24} />
          <h3 className="mt-5 font-medium">Cancellation policy</h3>
          <ul className="mt-1 text-gray-500 dark:text-gray-400">
            <li>Free cancellation for 48 hours.</li>
            <li>Cancel before check-in on March 22 for a partial refund.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default SectionThingsToKnow
