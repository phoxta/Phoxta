import { SocialType } from '@/components/socials-share'
import { cn } from '@/lib/utils'
import { Facebook01Icon, InstagramFreeIcons, Mail01Icon, NewTwitterIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'
import { FC } from 'react'

interface Props {
  className?: string
  itemClass?: string
  socials?: SocialType[]
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
    icon: InstagramFreeIcons,
  },
]

const SocialsList: FC<Props> = ({ className, itemClass = 'block', socials = socialsDemo }) => {
  return (
    <nav className={cn('flex flex-wrap gap-x-3.5 gap-y-2 text-2xl', className)}>
      {socials.map((item, i) => (
        <Link key={i} className={itemClass} href={item.href} target="_blank" rel="noopener noreferrer">
          <HugeiconsIcon icon={item.icon} size={20} />
        </Link>
      ))}
    </nav>
  )
}

export default SocialsList
