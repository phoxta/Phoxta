import Img from '@/components/media/img'
import ButtonSecondary from '@/components/primitives/button-secondary'
import AppLink from '@/lib/nav/link'
import { ArrowRightIcon } from '@heroicons/react/24/solid'

export interface BestStaycationProperty {
  id: string | number
  thumbnail: string
  href: string
}

export interface SectionFindBestStaycationProps {
  className?: string
  data?: BestStaycationProperty[]
}

const DEMO_DATA: BestStaycationProperty[] = [
  {
    id: '1',
    thumbnail:
      'https://images.pexels.com/photos/161815/paris-eiffel-tower-france-161815.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    href: '/listing-stay-map',
  },
  {
    id: '2',
    thumbnail:
      '/images/catalog/2506923-1260.webp',
    href: '/listing-stay-map',
  },
  {
    id: '3',
    thumbnail:
      '/images/catalog/356844-1260.webp',
    href: '/listing-stay-map',
  },
]

export default function SectionFindBestStaycation({ className = '', data = DEMO_DATA }: SectionFindBestStaycationProps) {
  return (
    <div
      className={`nc-SectionFindBestStaycation -mx-4 bg-black px-4 py-16 sm:-mx-8 sm:px-8 xl:-mx-20 xl:px-20 ${className}`}
    >
      <div className="mb-12 flex flex-col items-end justify-between lg:flex-row">
        <div className="w-full max-w-4xl flex-1 text-white">
          <h2 className="text-4xl leading-none font-bold tracking-tight sm:text-5xl md:text-[64px]">
            Finds your best <span className="font-serif font-normal text-white italic">Staycation</span>
          </h2>
          <div className="mt-8 flex flex-wrap gap-4 text-sm font-semibold text-neutral-400">
            <AppLink href="/" className="transition-colors hover:text-white">
              [ HOMES ]
            </AppLink>
            <AppLink href="/" className="transition-colors hover:text-white">
              [ CARS RENTAL ]
            </AppLink>
            <AppLink href="/" className="transition-colors hover:text-white">
              [ EXPERIENCES ]
            </AppLink>
            <AppLink href="/" className="transition-colors hover:text-white">
              [ FLIGHTS ]
            </AppLink>
          </div>
        </div>

        <div className="mt-8 shrink-0 pr-4 text-right text-sm text-neutral-400 lg:mt-0 lg:max-w-xs xl:text-base">
          <p className="invisible mb-6 md:visible">
            Custom nail designs that reflect your mood, style, and everyday energy.
          </p>
          <ButtonSecondary
            href="/listing-stay"
            className="h-12 rounded-full border-none bg-white px-6! text-black hover:bg-neutral-200"
          >
            <span className="text-sm font-semibold">View all homes</span>
            <ArrowRightIcon className="ml-2 h-4 w-4" />
          </ButtonSecondary>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3">
        {data.map((item, index) => (
          <AppLink
            key={item.id}
            href={item.href}
            className={`group relative flex overflow-hidden ${
              index === 1
                ? 'mt-4 aspect-square rounded-full sm:aspect-auto sm:h-[600px] lg:mt-0 lg:h-[700px] lg:-translate-y-12'
                : 'aspect-3/4 rounded-[100px] rounded-t-full sm:aspect-auto sm:h-[500px] lg:h-[600px]'
            }`}
          >
            <Img
              src={item.thumbnail}
              alt="location"
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 33vw"
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/10 transition-colors duration-500 group-hover:bg-transparent"></div>
          </AppLink>
        ))}
      </div>
    </div>
  )
}
