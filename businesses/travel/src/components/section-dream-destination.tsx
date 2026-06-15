import { ArrowRightIcon } from '@heroicons/react/24/solid'
import clsx from 'clsx'
import Image from 'next/image'
import Link from 'next/link'
import { ReactNode } from 'react'
import { Button } from './button'
import { Divider } from './divider'
import { Heading } from './heading'
import { Text } from './text'

interface Props {
  className?: string
  heading?: ReactNode
}

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
          <Button outline href={'/stay-search-with-map'} className="mt-4">
            Explore destinations
            <ArrowRightIcon className="size-4 rtl:rotate-180" />
          </Button>
        </div>

        <Divider className="block lg:hidden" />
      </div>

      <div className="mt-16">
        <div className="flex w-full flex-col justify-between gap-6 md:flex-row xl:gap-9">
          <Link href="/stay-categories/london" className="group block w-full">
            <div className="relative aspect-5/7 w-full overflow-hidden rounded-t-full">
              <Image
                src="https://images.pexels.com/photos/33372737/pexels-photo-33372737.jpeg"
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
          </Link>

          <Link href="/stay-categories/tokyo" className="group block w-full">
            <div className="relative aspect-5/7 w-full overflow-hidden rounded-full">
              <Image
                src="https://images.pexels.com/photos/31541968/pexels-photo-31541968.jpeg"
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
          </Link>

          <Link href="/stay-categories/tokyo" className="group block w-full">
            <div className="relative aspect-5/7 w-full overflow-hidden rounded-t-full">
              <Image
                src="https://images.pexels.com/photos/27529259/pexels-photo-27529259.jpeg"
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
          </Link>
        </div>
      </div>
    </div>
  )
}
