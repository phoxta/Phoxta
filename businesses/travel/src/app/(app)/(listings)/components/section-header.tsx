import { Badge } from '@/components/badge'
import HostAvatar from '@/components/host-avatar'
import LikeSaveBtns from '@/components/like-save-btns'
import StartRating from '@/components/start-rating'
import { Location06Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

interface Props {
  title: string
  listingCategory: string
  reviewStart: number
  reviewCount: number
  address: string
  host: {
    displayName: string
    avatarUrl: string
  }
}

const SectionHeader = ({ address, host, listingCategory, reviewCount, reviewStart, title }: Props) => {
  return (
    <div className="flex flex-col items-start gap-y-6">
      <div className="flex w-full flex-col-reverse items-baseline justify-between gap-4 sm:flex-row">
        <h1 className="text-2xl font-[550] 2xl:text-3xl">{title}</h1>
        <LikeSaveBtns />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <div className="flex items-center">
          <HugeiconsIcon icon={Location06Icon} size={20} className="mb-0.5" />
          <span className="ms-1.5">{address}</span>
        </div>
        <span>·</span>
        <Badge>{listingCategory}</Badge>
        <span>·</span>
        <StartRating size="lg" point={reviewStart} reviewCount={reviewCount} />
      </div>

      <div className="flex items-center gap-5">
        <HostAvatar verifiedSize="size-4 *:data-[slot=icon]:size-3!" avatarUrl={host.avatarUrl} avatarSize="size-11" />
        <div className="flex flex-col">
          <span className="font-medium">Hosted by {host.displayName}</span>
          <span className="mt-0.5 text-sm font-[360] text-muted-foreground">Superhost · 2 years hosting</span>
        </div>
      </div>
    </div>
  )
}

export default SectionHeader
