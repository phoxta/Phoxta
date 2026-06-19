import { ListingType } from '@/type'
import { HotAirBalloonFreeIcons } from '@hugeicons/core-free-icons'
import { IconSvgElement } from '@hugeicons/react'
import { ExperiencesSearchForm } from './experiences-search-form'

// This business offers a single service — Experiences — so there's one search tab.
export const heroSearchFormTabsData: {
  name: ListingType
  icon: IconSvgElement
  href: string
  formComponent: React.ComponentType<{ formStyle: 'default' | 'small' }>
}[] = [
  { name: 'Experiences', icon: HotAirBalloonFreeIcons, href: '/', formComponent: ExperiencesSearchForm },
]
