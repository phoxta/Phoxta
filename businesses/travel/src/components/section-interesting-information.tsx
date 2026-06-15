import Image from 'next/image'
import { FC } from 'react'

export interface SectionInterestingInformationProps {
  className?: string
}

const STATS = [
  {
    value: '9M+',
    label: 'Active listings worldwide',
  },
  {
    value: '150K+',
    label: 'Cities and towns with active Airbnb listings',
  },
  {
    value: '220+',
    label: 'Countries and regions with Airbnb listings',
  },
  {
    value: '2B+',
    label: 'Airbnb guest arrivals all-time',
  },
  {
    value: '5M+',
    label: 'Hosts on Airbnb',
  },
  {
    value: '$3B+',
    label: 'Earned by hosts, all-time',
  },
]

const SectionInterestingInformation: FC<SectionInterestingInformationProps> = ({ className = '' }) => {
  return (
    <div className={`nc-SectionInterestingInformation ${className}`}>
      <div className="mb-12 lg:mb-16">
        <h2 className="text-4xl leading-tight font-bold tracking-tight sm:text-5xl md:text-[56px]">
          Some interesting information <br />
          <span className="font-serif font-normal italic">about the our.</span>
        </h2>
      </div>

      <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-20">
        <div className="relative w-full lg:w-1/2">
          <div className="aspect-4/3 overflow-hidden rounded-[32px]">
            <Image
              src="https://images.pexels.com/photos/1732414/pexels-photo-1732414.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
              alt="Interesting Information"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>

        <div className="flex w-full flex-col justify-center lg:w-1/2">
          <p className="mb-12 max-w-lg leading-relaxed font-medium text-neutral-600 dark:text-neutral-300">
            We love it for modern UI design because of its simple, clean, and distinctive geometric style and the
            designers actively work.
          </p>

          <div className="grid grid-cols-2 gap-x-8 gap-y-12">
            {STATS.map((stat, index) => (
              <div key={index} className="flex flex-col">
                <span className="mb-3 text-4xl font-semibold tracking-tight sm:text-5xl">{stat.value}</span>
                <span className="max-w-[200px] text-sm leading-snug font-medium text-neutral-500">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SectionInterestingInformation
