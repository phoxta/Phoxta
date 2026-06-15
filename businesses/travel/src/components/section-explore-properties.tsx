import ButtonSecondary from '@/components/button-secondary'
import { ArrowUpRightIcon } from '@heroicons/react/24/solid'
import Image from 'next/image'
import Link from 'next/link'
import { FC } from 'react'

export interface ExploreProperty {
  id: string | number
  name: string
  propertiesCount: number
  thumbnail: string
  href: string
}

export interface SectionExplorePropertiesProps {
  className?: string
  data?: ExploreProperty[]
}

const DEMO_DATA: ExploreProperty[] = [
  {
    id: '1',
    name: 'Paris - France',
    propertiesCount: 5120,
    thumbnail:
      'https://images.pexels.com/photos/161815/paris-eiffel-tower-france-161815.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    href: '/listing-stay-map',
  },
  {
    id: '2',
    name: 'Tokyo - Japan',
    propertiesCount: 3840,
    thumbnail:
      'https://images.pexels.com/photos/2506923/pexels-photo-2506923.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    href: '/listing-stay-map',
  },
  {
    id: '3',
    name: 'Rome - Italy',
    propertiesCount: 5880,
    thumbnail:
      'https://images.pexels.com/photos/532263/pexels-photo-532263.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    href: '/listing-stay-map',
  },
]

const SectionExploreProperties: FC<SectionExplorePropertiesProps> = ({ className = '', data = DEMO_DATA }) => {
  return (
    <div className={`nc-SectionExploreProperties relative ${className}`}>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3">
        {data.map((item, index) => (
          <Link
            key={item.id}
            href={item.href}
            className={`group relative flex flex-col items-center overflow-hidden rounded-2xl ${
              index === 1 ? 'lg:mt-12' : index === 2 ? 'lg:mt-24' : ''
            }`}
          >
            <div className="aspect-w-4 relative w-full aspect-h-5 sm:aspect-h-6">
              <Image
                src={item.thumbnail}
                alt={item.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>

            <div className="absolute bottom-0 left-0 flex w-full flex-col justify-end bg-linear-to-t from-black/60 to-transparent p-4 pt-12 text-white">
              <h2 className="text-xl font-medium">{item.name}</h2>
              <span className="mt-1 text-sm text-neutral-100">({item.propertiesCount}+ properties)</span>
            </div>
            {/* Overlay link */}
            <span className="absolute inset-0"></span>
          </Link>
        ))}
      </div>

      <div className="mt-14 flex items-center justify-center">
        <ButtonSecondary
          href="/listing-stay-map"
          className="group h-14 rounded-full border-neutral-200 px-8! hover:border-neutral-900"
        >
          <span className="mx-2 font-semibold text-neutral-900">Explore all Properties</span>
          <div className="flex h-10 w-10 scale-90 items-center justify-center rounded-full bg-neutral-900 text-white transition-transform group-hover:scale-100">
            <ArrowUpRightIcon className="h-4 w-4" />
          </div>
        </ButtonSecondary>
      </div>
    </div>
  )
}

export default SectionExploreProperties
