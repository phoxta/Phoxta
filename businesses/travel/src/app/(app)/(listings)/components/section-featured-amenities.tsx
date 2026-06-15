import { ICONS_MAP } from '@/data/data'
import { AddInvoiceIcon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

interface Props {
  featuredAmenities: { icon: string; text: string }[]
}

export const SectionFeaturedAmenities = ({ featuredAmenities }: Props) => {
  return (
    <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 sm:gap-8 md:grid-cols-4">
      {featuredAmenities.map((item, index) => (
        <div className="flex items-center gap-3 sm:gap-4" key={index}>
          <HugeiconsIcon icon={ICONS_MAP[item.icon] || CheckmarkCircle02Icon} size={24} />
          {item.text}
        </div>
      ))}
      <div className="flex items-center gap-3 sm:gap-4">
        <HugeiconsIcon icon={AddInvoiceIcon} size={24} />
        and more...
      </div>
    </div>
  )
}
