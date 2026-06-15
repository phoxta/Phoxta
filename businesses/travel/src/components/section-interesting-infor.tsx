import bgGradientImage from '@/images/gradient-bg-1.png'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import { StarIcon } from '@heroicons/react/20/solid'
import clsx from 'clsx'
import Image from 'next/image'
import { ReactNode } from 'react'
import GoogleLogoSvg from './google-logo-svg'
import { Heading } from './heading'
import { Text } from './text'

interface SectionInterestingInforProps {
  className?: string
  heading?: ReactNode
  description?: ReactNode
}

const STATS = [
  {
    value: '9M+',
    label: 'Active listings worldwide',
  },
  {
    value: '150K+',
    label: 'Cities and towns with active listings',
  },
  {
    value: '220+',
    label: 'Countries and regions with listings',
  },
  {
    value: '2B+',
    label: 'Soar guest arrivals all-time',
  },
]

const testimonials = [
  {
    name: 'Jane Cooper',
    job: 'Tuple founder',
    quote:
      'Stacks is the cleanest design system I’ve used. It helps a lot of projects done without thinking.<br /> Nice Work!',
  },
  {
    name: 'Alex Smith',
    job: 'Travel blogger',
    quote: 'With the clinic’s support, our home has gently transformed into a sanctuary of calm.',
  },
  {
    name: 'Jake Patel',
    job: 'Family therapist',
    quote:
      'Through the center’s guidance, our family has slowly grown into a refuge of peace. We speak with warmth and honesty now.',
  },
]

export default function SectionInterestingInfor({
  className,
  heading = (
    <>
      Some interesting information <span data-slot="italic">about the Soar!</span>
    </>
  ),
  description = (
    <>
      We believe that everyone deserves to experience the joy of discovery, and we are committed to making it easier
      than ever to plan your next adventure.
    </>
  ),
}: SectionInterestingInforProps) {
  return (
    <div className={clsx('', className)}>
      <div className="flex flex-col justify-between gap-5 sm:gap-8 md:flex-row md:items-end">
        <Heading bigger className="max-w-2xl">
          {heading}
        </Heading>
        <Text className="max-w-md">{description}</Text>
      </div>

      <div className="mt-14 grid gap-2 lg:grid-cols-4 lg:grid-rows-2">
        <div className="relative min-h-125 overflow-hidden rounded-2xl text-black lg:col-span-2 lg:row-span-2">
          <Image
            src={bgGradientImage}
            alt="bg gradient"
            fill
            className="rounded-2xl object-cover dark:brightness-90"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          <TabGroup className="relative flex h-full flex-col gap-10 p-5 sm:p-9">
            <TabPanels>
              {testimonials.map((testimonial, index) => (
                <TabPanel key={index} unmount={false} className="flex max-w-md flex-col focus:outline-none">
                  <GoogleLogoSvg />

                  <Text
                    className="mt-8 text-xl/relaxed"
                    dangerouslySetInnerHTML={{ __html: `&quot;${testimonial.quote}&quot;` }}
                  />

                  <div className="mt-5 flex">
                    <StarIcon className="size-4" />
                    <StarIcon className="size-4" />
                    <StarIcon className="size-4" />
                    <StarIcon className="size-4" />
                    <StarIcon className="size-4" />
                  </div>
                </TabPanel>
              ))}
            </TabPanels>

            <TabList className="mt-auto flex max-w-md gap-2.5 sm:gap-4">
              {testimonials.map((testimonial, index) => (
                <Tab key={index} className="group/tab relative flex-1 cursor-pointer pt-5 text-left focus:outline-none">
                  <div className="absolute inset-x-0 top-0 h-0.5 w-full rounded-full bg-neutral-800 opacity-0 transition-opacity group-hover/tab:opacity-100 group-data-[selected]/tab:opacity-100" />
                  <Text className="text-base/tight font-medium">{testimonial.name}</Text>
                  <Text className="mt-1.5 text-base/tight text-neutral-500">{testimonial.job}</Text>
                </Tab>
              ))}
            </TabList>
          </TabGroup>
        </div>
        {STATS.map((stat, index) => (
          <div
            key={index}
            className="relative flex flex-col gap-14 rounded-2xl bg-accent p-5 sm:p-8 dark:bg-neutral-800"
          >
            <Heading bigger className="tracking-[-2%]">
              {stat.value}
            </Heading>
            <Text className="mt-auto text-neutral-600 dark:text-neutral-300">{stat.label}</Text>
          </div>
        ))}
      </div>
    </div>
  )
}
