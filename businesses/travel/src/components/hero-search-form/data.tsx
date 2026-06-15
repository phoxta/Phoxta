import { ListingType } from '@/type'
import { Airplane02Icon, Car05Icon, HotAirBalloonFreeIcons, House04Icon } from '@hugeicons/core-free-icons'
import { IconSvgElement } from '@hugeicons/react'
import { ExperiencesSearchForm } from './experiences-search-form'
import { FlightSearchForm } from './flight-search-form'
import { RentalCarSearchForm } from './rental-car-search-form'
import { StaySearchForm } from './stay-search-form'

export const heroSearchFormTabsData: {
  name: ListingType
  icon: IconSvgElement
  href: string
  formComponent: React.ComponentType<{ formStyle: 'default' | 'small' }>
}[] = [
  { name: 'Stays', icon: House04Icon, href: '/', formComponent: StaySearchForm },
  { name: 'Experiences', icon: HotAirBalloonFreeIcons, href: '/experience', formComponent: ExperiencesSearchForm },
  { name: 'Cars', icon: Car05Icon, href: '/car', formComponent: RentalCarSearchForm },
  { name: 'Flights', icon: Airplane02Icon, href: '/flight', formComponent: FlightSearchForm },
]
