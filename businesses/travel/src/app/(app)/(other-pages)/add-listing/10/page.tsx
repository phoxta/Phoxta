import ButtonPrimary from '@/components/button-primary'
import ButtonSecondary from '@/components/button-secondary'
import { Divider } from '@/components/divider'
import { Heading } from '@/components/heading'
import StayCard2 from '@/components/stay-card2'
import { getStayListings } from '@/data/listings'
import { Edit02Icon, ViewIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

const Page = async () => {
  const listing = (await getStayListings())[0]

  return (
    <>
      <div>
        <Heading>This is your listing</Heading>
        <span className="mt-2 block text-muted-foreground">Preview how your listing looks to guests.</span>
      </div>

      <Divider />

      <div>
        <div className="mt-6 max-w-sm">
          <StayCard2 data={listing} />
        </div>
        <div className="mt-8 flex items-center gap-x-3">
          <ButtonSecondary href={'/add-listing/1'}>
            <HugeiconsIcon icon={Edit02Icon} size={20} />
            <span>Edit</span>
          </ButtonSecondary>

          <ButtonPrimary href={'/stay-listings/preview-stay-84763232'}>
            <HugeiconsIcon icon={ViewIcon} size={20} />
            <span>Preview</span>
          </ButtonPrimary>
        </div>
      </div>
      {/*  */}
      <Divider />
    </>
  )
}

export default Page
