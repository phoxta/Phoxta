import { Tab, TabGroup, TabList } from '@headlessui/react'
import { useEffect, useState } from 'react'
import ExperiencesCard from '@/components/cards/experiences-card'
import { getExperienceListings } from '@/data/listings'
import type { ExperienceListing } from '@/types/listings'

// Only experiences are routed on this storefront; the Homes and Cars tabs
// pointed at stay/car detail pages that do not exist here.
const tabs = ['Experiences'] as const

interface Props {
  onChangeTab?: (item: string) => void
}

export default function ListingTabs({ onChangeTab }: Props) {
  const [experienceListings, setExperienceListings] = useState<ExperienceListing[]>([])
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>(tabs[0])

  useEffect(() => {
    if (activeTab === 'Experiences' && !experienceListings.length) {
      setExperienceListings(getExperienceListings())
    }
  }, [activeTab, experienceListings.length])

  const handleTabChange = (index: number) => {
    onChangeTab?.(tabs[index])
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
        {activeTab === 'Experiences' &&
          experienceListings.slice(0, 4).map((experience) => <ExperiencesCard key={experience.id} data={experience} />)}
      </div>
    </div>
  )
}
