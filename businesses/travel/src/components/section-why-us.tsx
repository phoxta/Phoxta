'use client'

import avatar1 from '@/images/avatars/Image-1.png'
import avatar2 from '@/images/avatars/Image-2.png'
import avatar3 from '@/images/avatars/Image-3.png'
import { DollarSquareIcon, House01FreeIcons, StarSquareIcon, UserAdd02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Image from 'next/image'
import { FC, ReactNode } from 'react'
import Avatar from './avatar'
import { Button } from './button'
import { Heading } from './heading'
import Logo from './logo'
import { Text } from './text'

//
interface SectionWhyUsProps {
  heading?: ReactNode
  description?: string
}

const users = [
  {
    id: 1,
    name: 'Alice',
    avatarUrl: avatar1.src,
  },
  {
    id: 2,
    name: 'Bob',
    avatarUrl: avatar2.src,
  },
  {
    id: 3,
    name: 'Charlie',
    avatarUrl: avatar3.src,
  },
]

const facts = [
  {
    icon: DollarSquareIcon,
    title: '$1.5B+ earned',
    description: 'Earned by hosts, all-time',
    mlClass: 'ml-0',
  },
  {
    icon: House01FreeIcons,
    title: 'Guest arrivals',
    description: 'Over 10M+ guest arrivals',
    mlClass: 'sm:ml-5',
  },
  {
    icon: StarSquareIcon,
    title: '4.9 average rating',
    description: 'Over 94,370 verified reviews ',
    mlClass: 'sm:ml-10',
  },
]

const SectionWhyUs: FC<SectionWhyUsProps> = ({
  heading = (
    <>
      Why customers <span data-slot="italic">rely on us</span> for travel
    </>
  ),
  description = 'We help you find the perfect stay for your needs. Whether you’re looking for a cozy cabin, a luxurious villa, we have something for everyone.',
}) => {
  return (
    <div className="relative flex flex-col gap-8 overflow-hidden sm:gap-20 lg:flex-row">
      <div className="flex flex-1 flex-col items-start gap-4 self-center sm:gap-7 lg:pe-14">
        <Logo />
        <Heading fontSize="text-4xl lg:text-5xl xl:text-6xl" className="max-w-lg">
          {heading}
        </Heading>
        <Text className="max-w-md text-neutral-600 dark:text-neutral-400">{description}</Text>
        <Button className="mt-5" href="/signup">
          <HugeiconsIcon icon={UserAdd02Icon} size={20} color="currentColor" strokeWidth={1.5} />
          Become a host
        </Button>
        <div className="flex items-center gap-x-2">
          <div className="flex items-center justify-center -space-x-2">
            {users.map((user) => (
              <Avatar key={user.id} src={user.avatarUrl} className="size-7 ring-2 ring-white dark:ring-zinc-900" />
            ))}
          </div>
          <Text className="text-sm text-gray-500">
            <span className="font-[450] text-gray-900 dark:text-gray-100">1M+ hosts</span> already signed up
          </Text>
        </div>
      </div>

      <div className="flex-1">
        <div className="relative aspect-6/7 sm:aspect-7/6 lg:aspect-6/7 xl:aspect-square">
          <Image
            src={'https://images.pexels.com/photos/7891883/pexels-photo-7891883.jpeg'}
            alt={''}
            priority
            fill
            className="z-0 rounded-2xl object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />

          <div className="absolute inset-x-3 bottom-3 flex flex-col rounded-2xl lg:bottom-14 lg:-left-16 xl:-left-20">
            {facts.map((fact) => (
              <div
                key={fact.title}
                className={`${fact.mlClass} mt-2.5 max-w-72 rounded-2xl bg-white p-3 shadow-lg sm:mt-7 sm:p-5 dark:bg-neutral-800`}
              >
                <div className="flex items-center justify-between gap-5">
                  <div>
                    <Text className="font-medium">{fact.title}</Text>
                    <Text className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">{fact.description}</Text>
                  </div>
                  <HugeiconsIcon icon={fact.icon} size={32} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SectionWhyUs
