import stayHeroImg from '@/assets/images/hero-img-stay.webp'
import Img from '@/components/media/img'
import { Badge } from '@/components/primitives/badge'
import { Heading } from '@/components/primitives/heading'
import HeroSearchForm2 from '@/components/search/desktop/hero-search-form2'
import type { ListingType } from '@/types/domain'
import { House03Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import clsx from 'clsx'

interface Props {
  className?: string
  subHeading?: string
  subHeadingIcon?: IconSvgElement
  heading?: string
  searchFormInitTab?: ListingType
  heroImg?: string | StaticImage
}

export default function HeroSection4({
  className,
  heading = `<span data-slot="italic">Pet-friendly</span> vacation rentals in San Mateo`,
  subHeading = '140 vacation rentals in San Mateo',
  subHeadingIcon = House03Icon,
  searchFormInitTab = 'Stays',
  heroImg = stayHeroImg,
}: Props) {
  return (
    <div
      className={clsx(
        'section-hero-4',
        className,
        searchFormInitTab === 'Stays' || searchFormInitTab === 'Experiences' ? 'sm:pb-12' : 'sm:pb-22'
      )}
    >
      <div className={clsx('relative z-10 flex w-full items-center justify-center sm:min-h-96')}>
        <Img src={heroImg} alt="hero" className="rounded-3xl object-cover" fill priority />
        <div className="absolute inset-0 rounded-3xl bg-linear-to-b from-sky-900/80 to-sky-900/40 opacity-30" />

        <div className="relative container flex flex-1 py-20 sm:pt-32 sm:pb-42">
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <Badge color="white" className="mb-5 sm:text-sm/6">
              <HugeiconsIcon icon={subHeadingIcon} size={20} color="currentColor" strokeWidth={1.5} />
              {subHeading}
            </Badge>
            <Heading
              level={1}
              fontSize="text-4xl/none md:text-5xl/none lg:text-6xl/none 2xl:text-7xl/none font-medium text-white"
              dangerouslySetInnerHTML={{ __html: heading }}
            />
          </div>
        </div>
        <HeroSearchForm2
          showTabs={false}
          initTab={searchFormInitTab}
          className="absolute bottom-0 left-1/2 max-w-6xl -translate-x-1/2 translate-y-1/2"
        />
      </div>
    </div>
  )
}
