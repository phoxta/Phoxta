'use client'

import CarCard from '@/components/car-card'
import ExperiencesCard from '@/components/experiences-card'
import StayCard2 from '@/components/stay-card2'
import {
  getCarListings,
  getExperienceListings,
  getStayListings,
  TCarListing,
  TExperienceListing,
  TStayListing,
} from '@/data/listings'
import { Tab, TabGroup, TabList } from '@headlessui/react'
import { useEffect, useState } from 'react'

const tabs = ['Homes', 'Experiences', 'Cars'] as const

interface Props {
  onChangeTab?: (item: string) => void
}

const ListingTabs = ({ onChangeTab }: Props) => {
  const [stayListings, setStayListings] = useState<TStayListing[]>([])
  const [carListings, setCarListings] = useState<TCarListing[]>([])
  const [experienceListings, setExperienceListings] = useState<TExperienceListing[]>([])
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>(tabs[0])

  useEffect(() => {
    const fetchListings = async () => {
      if (activeTab === 'Homes' && !stayListings.length) {
        const stays = await getStayListings()
        setStayListings(stays)
      } else if (activeTab === 'Cars' && !carListings.length) {
        const cars = await getCarListings()
        setCarListings(cars)
      } else if (activeTab === 'Experiences' && !experienceListings.length) {
        const experiences = await getExperienceListings()
        setExperienceListings(experiences)
      }
    }

    fetchListings()
  }, [activeTab, stayListings.length, carListings.length, experienceListings.length])

  const handleTabChange = async (index: number) => {
    onChangeTab && onChangeTab(tabs[index])
    setActiveTab(tabs[index])
  }

  return (
    <div className="w-full">
      <TabGroup onChange={handleTabChange} className="relative hidden-scrollbar flex w-full overflow-x-auto text-base">
        <TabList className="flex sm:gap-x-1.5">
          {tabs.map((item, index) => (
            <Tab
              key={index}
              className="block rounded-full px-4 py-2.5 leading-none font-medium whitespace-nowrap focus-within:outline-hidden data-hover:bg-accent data-[selected]:bg-foreground data-[selected]:text-background sm:px-6 sm:py-3"
            >
              {item}
            </Tab>
          ))}
        </TabList>
      </TabGroup>

      <div className="mt-8 grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 xl:gap-x-7 xl:gap-y-10">
        {activeTab === 'Homes' && stayListings.slice(0, 4).map((stay) => <StayCard2 key={stay.id} data={stay} />)}

        {activeTab === 'Cars' && carListings.slice(0, 4).map((car) => <CarCard key={car.id} data={car} />)}

        {activeTab === 'Experiences' &&
          experienceListings.slice(0, 4).map((experience) => <ExperiencesCard key={experience.id} data={experience} />)}
      </div>
    </div>
  )
}

export default ListingTabs
