import { Facebook01Icon, InstagramIcon, Mail01Icon, NewTwitterIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon, IconSvgElement } from '@hugeicons/react'
import clsx from 'clsx'
import Link from 'next/link'
import { FC } from 'react'

interface SocialsShareProps {
  className?: string
  itemClass?: string
  socials?: SocialType[]
}

export interface SocialType {
  name: string
  icon: IconSvgElement
  href: string
}

const socialsDemo: SocialType[] = [
  {
    name: 'Facebook',
    href: '#',
    icon: Facebook01Icon,
  },
  {
    name: 'Email',
    href: '#',
    icon: Mail01Icon,
  },
  {
    name: 'Twitter',
    href: '#',
    icon: NewTwitterIcon,
  },
  {
    name: 'Instagram',
    href: '#',
    icon: InstagramIcon,
  },
]

const SocialsShare: FC<SocialsShareProps> = ({ className, itemClass = '', socials = socialsDemo }) => {
  const renderItem = (item: SocialType, index: number) => {
    return (
      <Link
        key={index}
        href={item.href}
        className={`-mx-2 flex items-center gap-x-2.5 rounded-lg p-2.5 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-neutral-700 ${itemClass}`}
        title={`Share on ${item.name}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <HugeiconsIcon icon={item.icon} size={24} color="currentColor" strokeWidth={1.5} />
        <p className="text-sm">{item.name}</p>
      </Link>
    )
  }

  return (
    <div className={clsx('flex w-48 flex-col rounded-xl border bg-popover px-4 py-2.5', className)}>
      {socials.map(renderItem)}
    </div>
  )
}

export default SocialsShare
