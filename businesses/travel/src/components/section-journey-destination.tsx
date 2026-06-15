'use client'

import ButtonSecondary from '@/components/button-secondary'
import { ArrowUpRightIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid'
import Image from 'next/image'
import Link from 'next/link'
import { FC, useState } from 'react'

export interface DestinationProperty {
  id: string | number
  name: string
  thumbnail: string
  href: string
}

export interface SectionJourneyDestinationProps {
  className?: string
  data?: DestinationProperty[]
}

const DEMO_DATA: DestinationProperty[] = [
  {
    id: '1',
    name: 'Rome',
    thumbnail:
      'https://images.pexels.com/photos/532263/pexels-photo-532263.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    href: '/listing-stay-map',
  },
  {
    id: '2',
    name: 'Paris',
    thumbnail:
      'https://images.pexels.com/photos/161815/paris-eiffel-tower-france-161815.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    href: '/listing-stay-map',
  },
  {
    id: '3',
    name: 'New York',
    thumbnail:
      'https://images.pexels.com/photos/356844/pexels-photo-356844.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    href: '/listing-stay-map',
  },
  {
    id: '4',
    name: 'Tokyo',
    thumbnail:
      'https://images.pexels.com/photos/2506923/pexels-photo-2506923.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    href: '/listing-stay-map',
  },
]

const TABS = ['Thailand', 'France', 'New York', 'Japan']

const SectionJourneyDestination: FC<SectionJourneyDestinationProps> = ({ className = '', data = DEMO_DATA }) => {
  const [tabActive, setTabActive] = useState('France')

  return (
    <div className={`nc-SectionJourneyDestination ${className}`}>
      <div className="mb-12 flex flex-col items-start justify-between lg:mb-16 lg:flex-row lg:items-end">
        <div className="max-w-2xl">
          <h2 className="text-4xl leading-tight font-bold tracking-tight sm:text-5xl md:text-[56px]">
            Start your journey to your <br />
            <span className="font-serif font-normal italic">dream destination</span>
          </h2>
        </div>

        <div className="mt-8 flex flex-col items-start text-right lg:mt-0 lg:items-end">
          <p className="mb-4 font-medium text-neutral-600 dark:text-neutral-300">
            Get 15% discount on your first order!
          </p>
          <ButtonSecondary
            href="/listing-stay"
            className="h-12 rounded-full border-neutral-200 bg-white px-6! text-black hover:bg-neutral-50"
          >
            <span className="text-sm font-semibold">Explore destinations</span>
            <ArrowUpRightIcon className="ml-2 h-4 w-4" />
          </ButtonSecondary>
        </div>
      </div>

      <div className="mb-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
        <ul className="hiddenScrollbar flex space-x-2 overflow-x-auto">
          {TABS.map((tab, index) => (
            <li key={index}>
              <button
                className={`block shrink-0 rounded-full border px-6 py-2.5 text-sm font-medium capitalize transition-colors focus:outline-none sm:text-base ${
                  tabActive === tab
                    ? 'border-neutral-900 bg-neutral-900 text-white shadow-sm'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                }`}
                onClick={() => setTabActive(tab)}
              >
                {tab}
              </button>
            </li>
          ))}
        </ul>

        {/* Navigation Arrows */}
        <div className="flex items-center space-x-2">
          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-white transition-colors hover:bg-neutral-800">
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <button className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 text-neutral-900 transition-colors hover:bg-neutral-100">
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {data.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="group relative flex aspect-3/4 flex-col overflow-hidden rounded-2xl sm:aspect-4/5"
          >
            <Image
              src={item.thumbnail}
              alt={item.name}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            />
            {/* Overlay for icon/text visibility */}
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/20 to-transparent"></div>

            <div className="absolute inset-x-4 bottom-4 flex items-center justify-between rounded-full bg-white p-2 pl-6 shadow-sm">
              <span className="text-sm font-semibold text-neutral-900">{item.name}</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-900">
                <ArrowUpRightIcon className="h-3.5 w-3.5" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default SectionJourneyDestination
