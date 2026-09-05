import Img from '@/components/media/img'
import { Button } from '@/components/primitives/button'
import { Divider } from '@/components/primitives/divider'
import { Heading } from '@/components/primitives/heading'
import { Text } from '@/components/primitives/text'
import AppLink from '@/lib/nav/link'
import { ArrowRightIcon } from '@heroicons/react/24/solid'
import clsx from 'clsx'
import type { ReactNode } from 'react'

interface Props {
  className?: string
  heading?: ReactNode
}

// Every destination link lands on the experience search, which is the only
// search page this storefront routes.
const searchHref = (location: string) => `/experience-search?location=${encodeURIComponent(location)}`

export default function SectionDreamDestination({
  className,
  heading = (
    <>
      Take the first step toward your <span data-slot="italic">dream destination</span>
    </>
  ),
}: Props) {
  return (
    <div className={clsx('', className)}>
      <div className="flex flex-col justify-between gap-8 lg:flex-row">
        <div className="flex-2/3">
          <Heading className="max-w-2xl" bigger>
            {heading}
          </Heading>
        </div>

        <div className="flex-1/3">
          <Text>Get 15% discount on your first booking!</Text>
          <Button outline href={'/experience-search'} className="mt-4">
            Explore destinations
            <ArrowRightIcon className="size-4 rtl:rotate-180" />
          </Button>
        </div>

        <Divider className="block lg:hidden" />
      </div>

      <div className="mt-16">
        <div className="flex w-full flex-col justify-between gap-6 md:flex-row xl:gap-9">
          <AppLink href={searchHref('London')} className="group block w-full">
            <div className="relative aspect-5/7 w-full overflow-hidden rounded-t-full">
              <Img
                src="/images/catalog/33372737-1200.webp"
                alt="London"
                fill
                className="rounded-b-xl object-cover transition-[filter] group-hover:brightness-85"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
            <Text className="mt-2.5 text-left text-sm">
              <span className="group-hover:underline">London (5120+ properties) </span>
              <span> &#8599;</span>
            </Text>
          </AppLink>

          <AppLink href={searchHref('Tokyo')} className="group block w-full">
            <div className="relative aspect-5/7 w-full overflow-hidden rounded-full">
              <Img
                src="/images/catalog/31541968-1200.webp"
                alt="Tokyo"
                fill
                className="object-cover transition-[filter] group-hover:brightness-85"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
            <Text className="mt-2.5 text-center text-sm">
              <span className="opacity-0"> &#8599;</span>
              <span className="group-hover:underline">Tokyo (6180+ properties)</span>
              <span> &#8599;</span>
            </Text>
          </AppLink>

          <AppLink href={searchHref('Rome')} className="group block w-full">
            <div className="relative aspect-5/7 w-full overflow-hidden rounded-t-full">
              <Img
                src="/images/catalog/27529259-1200.webp"
                alt="Rome"
                className="z-0 rounded-b-xl object-cover transition-[filter] group-hover:brightness-85"
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
            <Text className="mt-2.5 text-right text-sm">
              <span className="group-hover:underline">Rome (8820+ properties)</span>
              <span> &#8599;</span>
            </Text>
          </AppLink>
        </div>
      </div>
    </div>
  )
}
