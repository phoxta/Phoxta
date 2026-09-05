import { HomeIcon } from '@heroicons/react/24/outline'
import {
  Award04Icon,
  Calendar01Icon,
  Comment01Icon,
  Flag03Icon,
  Medal01Icon,
  Navigation03Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import type { RouteProps } from '@/app/route-renderer'
import HostAvatar from '@/components/cards/host-avatar'
import ListingReview from '@/components/cards/listing-review'
import StartRating from '@/components/cards/start-rating'
import { Link } from '@/components/chrome/link'
import SocialsList from '@/components/chrome/socials-list'
import ButtonSecondary from '@/components/primitives/button-secondary'
import { Divider } from '@/components/primitives/divider'
import { getAuthorByHandle } from '@/data/authors'
import { getListingReviews } from '@/data/content'
import ListingTabs from '@/routes/pages/author-listing-tabs'

export default function AuthorDetailPage({ params }: RouteProps) {
  const handle = params.handle ?? ''

  const reviews = getListingReviews(handle)
  // Always resolves — an unknown handle falls back to the first author.
  const { displayName, avatarUrl, count, description, starRating, address, languages, joinedDate, reviewsCount } =
    getAuthorByHandle(handle)

  const renderSidebar = () => {
    return (
      <div className="flex w-full flex-col items-start gap-y-7 rounded-2xl shadow-lg-for-card bg-card p-4 sm:p-6 xl:p-8">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
          <HostAvatar avatarUrl={avatarUrl} avatarSize="size-20 xl:size-24" name={displayName} verifiedSize="size-7" />
          <div className="flex flex-col">
            <h2 className="text-2xl font-medium sm:text-3xl">{displayName}</h2>
            <div className="mt-3 flex items-center text-sm">
              <StartRating point={starRating} reviewCount={reviewsCount} />
              <span className="mx-2">·</span>
              <span>{count} listings</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-x-1.5">
            <HugeiconsIcon icon={Medal01Icon} size={20} color="currentColor" strokeWidth={1.5} />
            Supperhost
          </div>
          <div className="w-px bg-border"></div>
          <div className="flex items-center gap-x-1.5">
            <HugeiconsIcon icon={Award04Icon} size={20} color="currentColor" strokeWidth={1.5} />
            2+ years
          </div>
        </div>

        {/* ---- */}
        <p className="max-w-md leading-relaxed">{description}</p>

        {/* ---- */}
        <SocialsList
          className="text-accent-foreground"
          itemClass="flex items-center justify-center size-9 rounded-full bg-accent"
        />

        {/* ---- */}
        <div className="flex flex-col gap-y-3.5 text-muted-foreground">
          <div className="flex items-center gap-x-4">
            <HomeIcon className="size-6" />
            <span>{address}</span>
          </div>

          <div className="flex items-center gap-x-4">
            <HugeiconsIcon icon={Comment01Icon} className="size-6" />
            <span>{languages}</span>
          </div>

          <div className="flex items-center gap-x-4">
            <HugeiconsIcon icon={Calendar01Icon} className="size-6" />
            <span>{`Joined on ${joinedDate}`}</span>
          </div>
        </div>

        {/* == */}
        <div className="flex gap-2">
          <ButtonSecondary>Message host</ButtonSecondary>
          <ButtonSecondary>
            Share
            <HugeiconsIcon icon={Navigation03Icon} size={20} />
          </ButtonSecondary>
        </div>

        <Divider />
        <Link href={'#'} className="flex items-center gap-x-2 text-sm text-neutral-700 dark:text-neutral-300">
          <HugeiconsIcon icon={Flag03Icon} size={16} color="currentColor" strokeWidth={1.5} />
          <span>Report this host</span>
        </Link>
      </div>
    )
  }

  const renderSectionListings = () => {
    return (
      <div>
        <div className="mb-11">
          <h2 className="text-2xl font-medium sm:text-3xl">{displayName}&apos;s listings</h2>
          <span className="mt-2 block text-muted-foreground">
            {displayName}&apos;s listings is very rich, 5 star reviews help him to be more branded.
          </span>
        </div>
        <ListingTabs />
      </div>
    )
  }

  const renderSectionReviews = () => {
    return (
      <div>
        {/* HEADING */}
        <h2 className="text-2xl font-medium sm:text-3xl">What guests are saying about {displayName}</h2>

        {/* comment */}
        <div className="mt-12 divide-y divide-border">
          {reviews.slice(0, 4).map((review) => (
            <ListingReview key={review.id} className="py-8 first:pt-0 last:pb-0" reivew={review} />
          ))}

          <div className="pt-8">
            <ButtonSecondary>View more 20 reviews</ButtonSecondary>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <main className="container mt-8 mb-20 flex flex-col gap-10 sm:mt-12 lg:mb-32 lg:flex-row xl:gap-16 2xl:gap-20">
        <div className="grow">
          <div className="lg:sticky lg:top-8">{renderSidebar()}</div>
        </div>

        <div className="mt-5 w-full shrink-0 space-y-16 sm:space-y-20 lg:mt-0 lg:w-3/5 xl:w-[62%]">
          {renderSectionListings()}
          {renderSectionReviews()}
        </div>
      </main>
    </div>
  )
}
